using UnityEngine;
using TMPro;

public class CombinedHUD : MonoBehaviour
{
    public TextMeshProUGUI label;
    public string format = "Lives Saved: {0}\nLives Lost: {1}\nTime Remaining: {2}";

    LivesTracker _tracker;
    CountdownTimer _timer;

    int _saved, _lost, _time;
    float _poll; // fallback polling

    void OnEnable()
    {
        if (!label) label = GetComponent<TextMeshProUGUI>();

#if UNITY_2023_1_OR_NEWER
        _tracker = LivesTracker.Instance ?? Object.FindFirstObjectByType<LivesTracker>();
        _timer   = CountdownTimer.Instance ?? Object.FindFirstObjectByType<CountdownTimer>();
#else
        _tracker = LivesTracker.Instance ?? Object.FindObjectOfType<LivesTracker>();
        _timer   = CountdownTimer.Instance ?? Object.FindObjectOfType<CountdownTimer>();
#endif

        if (_tracker != null)
        {
            _tracker.OnCountsChanged += OnCounts;
            _saved = _tracker.LivesSaved;
            _lost  = _tracker.LivesLost;
        }

        if (_timer != null)
        {
            _timer.OnTimeChanged += OnTime;
            _time = _timer.SecondsRemaining; // immediate paint with current time
        }

        Paint();
    }

    void OnDisable()
    {
        if (_tracker != null) _tracker.OnCountsChanged -= OnCounts;
        if (_timer   != null) _timer.OnTimeChanged     -= OnTime;
    }

    void Update()
    {
        // Fallback polling every 0.25s in case events were missed or timer got added late
        _poll += Time.deltaTime;
        if (_poll >= 0.25f)
        {
            _poll = 0f;

            if (_tracker == null)
#if UNITY_2023_1_OR_NEWER
                _tracker = LivesTracker.Instance ?? Object.FindFirstObjectByType<LivesTracker>();
#else
                _tracker = LivesTracker.Instance ?? Object.FindObjectOfType<LivesTracker>();
#endif

            if (_timer == null)
#if UNITY_2023_1_OR_NEWER
                _timer = CountdownTimer.Instance ?? Object.FindFirstObjectByType<CountdownTimer>();
#else
                _timer = CountdownTimer.Instance ?? Object.FindObjectOfType<CountdownTimer>();
#endif

            if (_tracker != null) { _saved = _tracker.LivesSaved; _lost = _tracker.LivesLost; }
            if (_timer   != null) { _time  = _timer.SecondsRemaining; }
            Paint();
        }
    }

    void OnCounts(int saved, int lost) { _saved = saved; _lost = lost; Paint(); }
    void OnTime(int secs)              { _time  = secs;   Paint(); }

    void Paint()
    {
        if (label) label.text = string.Format(format, _saved, _lost, _time);
    }
}
