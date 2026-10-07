package com.rabiespulse.app

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.LogSeverity
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.SamplerConfig
import com.google.ai.edge.litertlm.ThinkingConfig
import org.json.JSONObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.io.FileOutputStream

/**
 * On-device AI for RabiesPulse. The Gemma model ships INSIDE the APK (assets/models, stored
 * uncompressed). On first use it is copied once to app-private storage because LiteRT-LM needs a
 * file path. Nothing is ever downloaded and no text leaves the phone.
 *
 * JS events: aiStatus {state, progress, error, backend}, aiToken {id, text}, aiDone {id}, aiError {id, error}
 */
@CapacitorPlugin(name = "LocalAi")
class LocalAiPlugin : Plugin() {
    companion object {
        private const val TAG = "LocalAi"
        // Any LiteRT-LM model works: scripts/bundle_model.sh writes the file + model.json
        const val ASSET = "models/model.litertlm"
        const val INFO = "models/model.json"
        private const val MIN_FREE_RAM = 700L * 1024 * 1024
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val engineLock = Mutex()
    private val genLock = Mutex()

    @Volatile private var state = "idle" // idle | missing | unsupported | copying | loading | ready | error
    @Volatile private var progress = 0.0
    @Volatile private var error: String? = null
    @Volatile private var backend: String? = null
    @Volatile private var engine: Engine? = null
    @Volatile private var genJob: Job? = null
    @Volatile private var activeConversation: Conversation? = null

    private val modelName: String by lazy {
        try {
            JSONObject(context.assets.open(INFO).bufferedReader().use { it.readText() }).optString("name", "On-device model")
        } catch (e: Exception) {
            "On-device model"
        }
    }

    private fun statusObj() = JSObject().apply {
        put("state", state)
        put("progress", progress)
        put("error", error)
        put("backend", backend)
        put("model", modelName)
        put("bundled", isBundled())
    }

    private fun setState(s: String, err: String? = null) {
        state = s
        error = err
        notifyListeners("aiStatus", statusObj())
    }

    private fun isBundled(): Boolean = try {
        context.assets.openFd(ASSET).use { true }
    } catch (e: Exception) {
        false
    }

    @PluginMethod
    fun status(call: PluginCall) = call.resolve(statusObj())

    /** Copy (first run) + load the model in the background. Safe to call repeatedly. */
    @PluginMethod
    fun init(call: PluginCall) {
        if (state in setOf("copying", "loading", "ready")) return call.resolve(statusObj())
        scope.launch { prepare() }
        call.resolve(statusObj())
    }

    private suspend fun prepare() = engineLock.withLock {
        if (engine != null) return@withLock setState("ready")
        try {
            if (!isBundled()) return@withLock setState("missing", "modelNotBundled")
            val abis = Build.SUPPORTED_ABIS.toList()
            if ("arm64-v8a" !in abis && "x86_64" !in abis) return@withLock setState("unsupported", "abi")

            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val mem = ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }
            // needs roughly 3x the model size + 1 GB for Android and the app (Qwen 0.6B ≈ 2 GB, Gemma 1B ≈ 2.7 GB)
            val modelBytes = context.assets.openFd(ASSET).use { it.length }
            val minTotal = maxOf(2L * 1024 * 1024 * 1024, modelBytes * 3 + 1024L * 1024 * 1024)
            if (mem.totalMem < minTotal) return@withLock setState("unsupported", "lowRam")
            if (mem.availMem < MIN_FREE_RAM || mem.lowMemory) return@withLock setState("error", "lowMemory")

            val model = copyModelIfNeeded() ?: return@withLock
            setState("loading")
            Engine.setNativeMinLogSeverity(LogSeverity.ERROR)
            // CPU is the most compatible backend across phones; initialize() can take 5-30 s.
            val e = Engine(EngineConfig(modelPath = model.path, backend = Backend.CPU(), maxNumTokens = 2048, cacheDir = context.cacheDir.path))
            e.initialize()
            engine = e
            backend = "CPU"
            progress = 1.0
            setState("ready")
        } catch (t: Throwable) {
            Log.e(TAG, "model load failed", t)
            engine = null
            setState("error", (if (t is OutOfMemoryError) "lowMemory" else t.javaClass.simpleName + ": " + (t.message ?: "")).take(300))
        }
    }

    /** Copies the bundled asset to app-private storage once (≈584 MB). Returns null on failure. */
    private fun copyModelIfNeeded(): File? {
        val expected = context.assets.openFd(ASSET).use { it.length }
        val dest = File(context.filesDir, ASSET)
        if (dest.exists() && dest.length() == expected) return dest
        dest.parentFile?.mkdirs()
        if (context.filesDir.usableSpace < expected + 150L * 1024 * 1024) {
            setState("error", "noSpace")
            return null
        }
        setState("copying")
        val tmp = File(dest.path + ".part")
        context.assets.open(ASSET).use { input ->
            FileOutputStream(tmp).use { out ->
                val buf = ByteArray(1 shl 20)
                var done = 0L
                var lastPct = -1
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    done += n
                    val pct = (done * 100 / expected).toInt()
                    if (pct != lastPct) {
                        lastPct = pct
                        progress = done.toDouble() / expected
                        notifyListeners("aiStatus", statusObj())
                    }
                }
                out.fd.sync()
            }
        }
        if (tmp.length() != expected || !tmp.renameTo(dest)) {
            tmp.delete()
            setState("error", "copyFailed")
            return null
        }
        return dest
    }

    /**
     * Streams an answer. Params: id, prompt, system, history [{role:'user'|'model', text}].
     * Resolves immediately; tokens arrive as aiToken events.
     */
    @PluginMethod
    fun generate(call: PluginCall) {
        val e = engine ?: return call.reject("notReady")
        val id = call.getString("id") ?: "0"
        val prompt = call.getString("prompt") ?: return call.reject("noPrompt")
        val system = call.getString("system") ?: ""
        val history = mutableListOf<Message>()
        val arr: JSArray = call.getArray("history") ?: JSArray()
        for (i in 0 until arr.length()) {
            val m = arr.getJSONObject(i)
            val text = m.optString("text")
            if (text.isBlank()) continue
            history += if (m.optString("role") == "model") Message.model(text) else Message.user(text)
        }
        call.resolve()
        genJob = scope.launch {
            genLock.withLock {
                try {
                    val cfg = ConversationConfig(
                        systemInstruction = Contents.of(system),
                        initialMessages = history,
                        samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = 0.3, seed = 0),
                        maxOutputToken = 384,
                        // short direct answers: no hidden "thinking" tokens (Qwen3 supports both modes)
                        thinkingConfig = ThinkingConfig(enableThinking = false, thinkingTokenBudget = 0),
                    )
                    e.createConversation(cfg).use { conv ->
                        activeConversation = conv
                        conv.sendMessageAsync(prompt).collect { msg ->
                            notifyListeners("aiToken", JSObject().put("id", id).put("text", msg.toString()))
                        }
                    }
                    notifyListeners("aiDone", JSObject().put("id", id))
                } catch (t: Throwable) {
                    Log.e(TAG, "generation failed", t)
                    val err = if (t is kotlinx.coroutines.CancellationException) "cancelled" else (t.message ?: t.javaClass.simpleName)
                    notifyListeners("aiError", JSObject().put("id", id).put("error", err.take(300)))
                } finally {
                    activeConversation = null
                }
            }
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        try {
            activeConversation?.cancelProcess()
        } catch (_: Throwable) {
        }
        genJob?.cancel()
        call.resolve()
    }

    override fun handleOnDestroy() {
        scope.cancel()
        try {
            engine?.close()
        } catch (_: Throwable) {
        }
        engine = null
        super.handleOnDestroy()
    }
}
