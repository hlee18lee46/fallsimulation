using UnityEngine;
using TMPro;

[RequireComponent(typeof(TextMeshProUGUI))]
public class CollectiblesUI : MonoBehaviour
{
    public TextMeshProUGUI label;

    void Awake()
    {
        if (!label) label = GetComponent<TextMeshProUGUI>();
    }

    void OnEnable()
    {
        var t = CollectiblesTracker.Instance ?? FindFirstObjectByType<CollectiblesTracker>();
        if (t != null)
        {
            t.OnCountsChanged += OnCountsChanged;
            OnCountsChanged(t.Sugar, t.Bottles); // initial paint
        }
        else
        {
            label.text = "Sugar: 0\nWater Bottles: 0";
        }
    }

    void OnDisable()
    {
        var t = CollectiblesTracker.Instance;
        if (t != null) t.OnCountsChanged -= OnCountsChanged;
    }

    void OnCountsChanged(int sugar, int bottles)
    {
        label.text = $"Sugar: {sugar}\nWater Bottles: {bottles}";
    }
}
