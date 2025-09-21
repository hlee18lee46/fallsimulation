using System;
using UnityEngine;

public class LivesTracker : MonoBehaviour
{
    public static LivesTracker Instance { get; private set; }

    public int Saved { get; private set; }
    public int Lost  { get; private set; }

    // Legacy aliases/events so your HUD still works
    public int LivesSaved => Saved;
    public int LivesLost  => Lost;
    public event Action OnChanged;
    public event Action<int,int> OnCountsChanged;

    void Awake()
    {
        if (Instance && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    public void AddSaved() { Saved++; OnChanged?.Invoke(); OnCountsChanged?.Invoke(Saved, Lost); }
    public void AddLost()  { Lost++;  OnChanged?.Invoke(); OnCountsChanged?.Invoke(Saved, Lost); }
    public void ResetCounts(){ Saved = 0; Lost = 0; OnChanged?.Invoke(); OnCountsChanged?.Invoke(Saved, Lost); }
}
