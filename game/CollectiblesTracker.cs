// CollectiblesTracker.cs
using System;
using UnityEngine;

public class CollectiblesTracker : MonoBehaviour
{
    public static CollectiblesTracker Instance { get; private set; }

    public int Sugar  { get; private set; }
    public int Bottles { get; private set; }

    public event Action<int,int> OnCountsChanged;

    void Awake() {
        if (Instance && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        Notify();
    }

    public void AddSugar(int n = 1)  { Sugar   = Mathf.Max(0, Sugar   + n); Notify(); }
    public void AddBottle(int n = 1) { Bottles = Mathf.Max(0, Bottles + n); Notify(); }

    // New: safe spend helpers
    public bool TrySpendSugar(int n = 1) {
        if (Sugar < n) return false;
        Sugar -= n; Notify(); return true;
    }
    public bool TrySpendBottle(int n = 1) {
        if (Bottles < n) return false;
        Bottles -= n; Notify(); return true;
    }

    void Notify() => OnCountsChanged?.Invoke(Sugar, Bottles);
}
