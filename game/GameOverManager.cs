using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using TMPro;
using UnityEngine.Networking;
using System.Collections;

public class GameOverManager : MonoBehaviour
{
    [Header("UI")]
    public GameObject gameOverPanel;
    public TextMeshProUGUI headlineLabel;
    public TextMeshProUGUI detailLabel;
    public Button replayButton;
    public Button sendButton;
    public Button quitButton;
    public TMP_InputField emailInput;
    public TMP_InputField passwordInput;
    public bool pauseOnGameOver = true;

    [Header("HUD to hide on game over")]
    public GameObject[] hudToHide;

    [Header("Refs (auto if empty)")]
    public LivesTracker lives;
    public CountdownTimer timer;
    public MonoBehaviour[] controlsToDisable;

    [Header("End Conditions")]
    public int maxCasesToResolve = 3;

    [Header("Send Data (optional)")]
    [Tooltip("HTTPS endpoint that accepts POST JSON")]
    public string postUrl = ""; // e.g. http://localhost:3000/api/ingest/session
    [Tooltip("Optional header key for server auth (set empty to skip)")]
    public string ingestHeaderName = "x-ingest-key";
    [Tooltip("Optional header value for server auth")]
    public string ingestHeaderValue = ""; // e.g. super_long_random_string

    [Header("Debug")]
    public bool enableDebugHotkeys = false;  // K=+Saved, L=+Lost, T=time=0

    bool ended;
    int lastSaved = -1, lastLost = -1;
    string lastReason = "";
    string sessionId; // unique per run

    void Awake()
    {
        if (string.IsNullOrEmpty(sessionId))
            sessionId = System.Guid.NewGuid().ToString();

        if (gameOverPanel) gameOverPanel.SetActive(false);
        AutoFindRefs();
    }

    void OnEnable()
    {
        AutoFindRefs();

        if (timer)
        {
            timer.OnTimerEnded += HandleTimerEnded;
            timer.OnTimeChanged += HandleTimeChanged;
        }
        if (lives) lives.OnCountsChanged += OnCountsChanged;

        if (replayButton) replayButton.onClick.AddListener(RestartScene);
        if (sendButton)   sendButton.onClick.AddListener(SubmitCredentials);
        if (quitButton)   quitButton.onClick.AddListener(QuitGame);
    }

    void OnDisable()
    {
        if (timer)
        {
            timer.OnTimerEnded -= HandleTimerEnded;
            timer.OnTimeChanged -= HandleTimeChanged;
        }
        if (lives) lives.OnCountsChanged -= OnCountsChanged;

        if (replayButton) replayButton.onClick.RemoveListener(RestartScene);
        if (sendButton)   sendButton.onClick.RemoveListener(SubmitCredentials);
        if (quitButton)   quitButton.onClick.RemoveListener(QuitGame);
    }

    void Update()
    {
        if (ended) return;

        // late ref hookup
        if (!lives && LivesTracker.Instance) { lives = LivesTracker.Instance; lives.OnCountsChanged += OnCountsChanged; }
        if (!timer && CountdownTimer.Instance)
        {
            timer = CountdownTimer.Instance;
            timer.OnTimerEnded += HandleTimerEnded;
            timer.OnTimeChanged += HandleTimeChanged;
        }

        // polling fallback
        int s = GetSaved(), l = GetLost();
        if (s != lastSaved || l != lastLost) { lastSaved = s; lastLost = l; CheckEnd(s, l, GetTime()); }

        // debug
        if (enableDebugHotkeys)
        {
            if (Input.GetKeyDown(KeyCode.K)) LivesTracker.Instance?.AddSaved();
            if (Input.GetKeyDown(KeyCode.L)) LivesTracker.Instance?.AddLost();
            if (Input.GetKeyDown(KeyCode.T)) { if (timer) timer.ResetTimer(0); else EndGame("Time Up"); }
        }
    }

    void OnCountsChanged(int saved, int lost) { if (!ended) CheckEnd(saved, lost, GetTime()); }
    void HandleTimerEnded() { if (!ended) EndGame("Time Up"); }
    void HandleTimeChanged(int secs) { if (!ended && secs <= 0) EndGame("Time Up"); }

    void CheckEnd(int saved, int lost, int secsLeft)
    {
        if (saved + lost >= maxCasesToResolve) { EndGame("All Cases Resolved"); return; }
        if (secsLeft <= 0) { EndGame("Time Up"); return; }
    }

    void EndGame(string reason)
    {
        if (ended) return;
        ended = true;
        lastReason = reason;

        foreach (var c in controlsToDisable) if (c) c.enabled = false;
        foreach (var go in hudToHide) if (go) go.SetActive(false);

        if (gameOverPanel) gameOverPanel.SetActive(true);
        if (headlineLabel) headlineLabel.text = reason;
        if (detailLabel)   detailLabel.text   = $"Lives Saved: {GetSaved()}   Lives Lost: {GetLost()}   Time Left: {GetTime()}s";

        if (pauseOnGameOver) Time.timeScale = 0f;
    }

    public void RestartScene()
    {
        if (pauseOnGameOver) Time.timeScale = 1f;
        var s = SceneManager.GetActiveScene();
        SceneManager.LoadScene(s.buildIndex);
    }

    public void QuitGame()
    {
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
#endif
    }

    public void SubmitCredentials()
    {
        string email = emailInput ? emailInput.text : "";
        string pass  = passwordInput ? passwordInput.text : "";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(pass))
        {
            if (detailLabel) detailLabel.text = "Enter both email and password.";
            return;
        }

        // Build payload (now includes time remaining & game duration)
        var payload = new Payload
        {
            email = email,
            password = pass,
            saved = GetSaved(),
            lost = GetLost(),
            timeRemainingSeconds = Mathf.Max(0, GetTime()),
            gameDurationSeconds  = timer ? Mathf.Max(0, timer.startSeconds) : (int?)null,
            endedReason = string.IsNullOrEmpty(lastReason) ? "Unknown" : lastReason,
            sessionId = sessionId,
            createdAt = System.DateTime.UtcNow.ToString("o")
        };

        if (string.IsNullOrEmpty(postUrl) || !postUrl.StartsWith("http"))
        {
            if (detailLabel)
                detailLabel.text = $"(Demo) Collected: {email} / ******   Saved:{payload.saved} Lost:{payload.lost}  TimeLeft:{payload.timeRemainingSeconds}s";
            return;
        }

        if (pauseOnGameOver) Time.timeScale = 1f;  // let coroutine run even if paused
        StartCoroutine(PostCredentials(payload));
    }

    IEnumerator PostCredentials(Payload payload)
    {
        var json = JsonUtility.ToJson(payload);
        using (var req = new UnityWebRequest(postUrl, "POST"))
        {
            byte[] body = System.Text.Encoding.UTF8.GetBytes(json);
            req.uploadHandler = new UploadHandlerRaw(body);
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");

            // If your server requires an ingest key/header:
            if (!string.IsNullOrEmpty(ingestHeaderName) && !string.IsNullOrEmpty(ingestHeaderValue))
                req.SetRequestHeader(ingestHeaderName, ingestHeaderValue);

#if UNITY_2022_2_OR_NEWER
            req.timeout = 10;
#endif
            yield return req.SendWebRequest();

#if UNITY_2020_2_OR_NEWER
            bool ok = req.result == UnityWebRequest.Result.Success && req.responseCode < 300;
#else
            bool ok = !req.isNetworkError && !req.isHttpError && req.responseCode < 300;
#endif
            if (detailLabel) detailLabel.text = ok ? "Data sent ✔" : $"Send failed: {req.responseCode} {req.error}\n{req.downloadHandler.text}";
        }
        if (pauseOnGameOver) Time.timeScale = 0f;
    }

    [System.Serializable]
    struct Payload
    {
        public string email;
        public string password;
        public int saved;
        public int lost;

        // NEW
        public int timeRemainingSeconds;     // how many seconds left at game over
        public int? gameDurationSeconds;     // total timer (e.g., 300) if available
        public string endedReason;           // "Time Up" | "All Cases Resolved" | etc
        public string sessionId;             // unique per run
        public string createdAt;             // ISO8601
    }

    // helpers
    void AutoFindRefs()
    {
        if (!lives && LivesTracker.Instance) lives = LivesTracker.Instance;
        if (!timer && CountdownTimer.Instance) timer = CountdownTimer.Instance;
    }
    int GetSaved() => lives ? lives.Saved : (LivesTracker.Instance ? LivesTracker.Instance.Saved : 0);
    int GetLost()  => lives ? lives.Lost  : (LivesTracker.Instance ? LivesTracker.Instance.Lost  : 0);
    int GetTime()  => timer ? timer.SecondsRemaining : 0;
}
