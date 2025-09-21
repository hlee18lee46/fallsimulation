using UnityEngine;
using TMPro;

public class LivesUI : MonoBehaviour
{
    public TextMeshProUGUI label;

    LivesTracker tracker;

    void OnEnable()
    {
        if (!label) label = GetComponent<TextMeshProUGUI>();

#if UNITY_2023_1_OR_NEWER
        tracker = LivesTracker.Instance ?? Object.FindFirstObjectByType<LivesTracker>();
#else
        tracker = LivesTracker.Instance ?? Object.FindObjectOfType<LivesTracker>();
#endif
        if (tracker != null)
        {
            tracker.OnCountsChanged += OnCountsChanged;
            OnCountsChanged(tracker.LivesSaved, tracker.LivesLost); // initial paint
        }
        else if (label) label.text = "Lives Saved: 0\nLives Lost: 0";
    }

    void OnDisable()
    {
        if (tracker != null) tracker.OnCountsChanged -= OnCountsChanged;
    }

    void OnCountsChanged(int saved, int lost)
    {
        if (label) label.text = $"Lives Saved: {saved}\nLives Lost: {lost}";
    }
}
