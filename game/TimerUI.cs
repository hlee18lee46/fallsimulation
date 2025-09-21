using UnityEngine;
using TMPro;

public class TimerUI : MonoBehaviour
{
    public TextMeshProUGUI label;
    public bool showMMSS = false; // set true for 04:59 format

    CountdownTimer timer;
    float poll;

    void OnEnable()
    {
        if (!label) label = GetComponent<TextMeshProUGUI>();

#if UNITY_2023_1_OR_NEWER
        timer = CountdownTimer.Instance ?? Object.FindFirstObjectByType<CountdownTimer>();
#else
        timer = CountdownTimer.Instance ?? Object.FindObjectOfType<CountdownTimer>();
#endif
        if (timer != null)
        {
            timer.OnTimeChanged += OnTimeChanged;
            OnTimeChanged(timer.SecondsRemaining); // initial paint
        }
        else if (label) label.text = "Time Remaining: 0";
    }

    void OnDisable()
    {
        if (timer != null) timer.OnTimeChanged -= OnTimeChanged;
    }

    void Update()
    {
        // Light polling in case the timer spawns later
        poll += Time.deltaTime;
        if (poll >= 0.25f)
        {
            poll = 0f;
            var t = CountdownTimer.Instance;
            if (t != null) OnTimeChanged(t.SecondsRemaining);
        }
    }

    void OnTimeChanged(int secs)
    {
        if (!label) return;
        if (showMMSS)
        {
            int m = secs / 60, s = secs % 60;
            label.text = $"Time Remaining: {m:00}:{s:00}";
        }
        else
        {
            label.text = $"Time Remaining: {secs}";
        }
    }
}
