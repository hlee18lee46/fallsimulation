using System;
using UnityEngine;

public class CountdownTimer : MonoBehaviour
{
    public static CountdownTimer Instance { get; private set; }

    public int startSeconds = 300;
    public bool autoStart = true;

    public int SecondsRemaining { get; private set; }
    public bool IsRunning { get; private set; }

    public event Action<int> OnTimeChanged;
    public event Action OnTimerEnded;

    float _accum;

    void Awake()
    {
        if (Instance && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        SecondsRemaining = Mathf.Max(0, startSeconds);
        OnTimeChanged?.Invoke(SecondsRemaining);
        if (autoStart) StartTimer();
    }

    public void StartTimer() { IsRunning = true; _accum = 0f; OnTimeChanged?.Invoke(SecondsRemaining); }
    public void PauseTimer() { IsRunning = false; }
    public void ResetTimer(int secs = -1)
    {
        SecondsRemaining = (secs >= 0) ? secs : startSeconds;
        _accum = 0f;
        OnTimeChanged?.Invoke(SecondsRemaining);
    }

    void Update()
    {
        if (!IsRunning || SecondsRemaining <= 0) return;

        _accum += Time.deltaTime;
        if (_accum >= 1f)
        {
            int ticks = Mathf.FloorToInt(_accum);
            _accum -= ticks;

            SecondsRemaining = Mathf.Max(0, SecondsRemaining - ticks);
            OnTimeChanged?.Invoke(SecondsRemaining);

            if (SecondsRemaining == 0)
            {
                IsRunning = false;
                OnTimerEnded?.Invoke();
            }
        }
    }
}

