using UnityEngine;

[RequireComponent(typeof(Collider))]
public class Pickup : MonoBehaviour
{
    public enum PickupType { AutoFromTag, Sugar, Bottle }

    [Header("Setup")]
    public PickupType type = PickupType.AutoFromTag;
    [Tooltip("What to delete after pickup (defaults to this GameObject).")]
    public GameObject rootToDestroy;

    [Header("Feedback (optional)")]
    public AudioClip pickupSfx;
    [Range(0f,1f)] public float sfxVolume = 1f;
    public float destroyDelay = 0.05f;   // give a frame for SFX to spawn

    bool picked;

    void Awake()
    {
        // Ensure trigger collider
        var col = GetComponent<Collider>();
        col.isTrigger = true;

        if (!rootToDestroy) rootToDestroy = gameObject;

        // Auto-detect type from tag if requested
        if (type == PickupType.AutoFromTag)
        {
            if (CompareTag("sugar") || CompareTag("collidableSugar"))
                type = PickupType.Sugar;
            else if (CompareTag("bottle") || CompareTag("waterbottle") || CompareTag("collidableBottle"))
                type = PickupType.Bottle;
            else
                Debug.LogWarning($"[Pickup] {name} has AutoFromTag but unrecognized tag '{tag}'. Set type manually.");
        }
    }

    void OnTriggerEnter(Collider other)
    {
        if (picked) return;                         // avoid double hits
        if (!other.CompareTag("Player")) return;    // only player collects

        picked = true;

        // Count it
        if (type == PickupType.Sugar)
            CollectiblesTracker.Instance?.AddSugar(1);
        else if (type == PickupType.Bottle)
            CollectiblesTracker.Instance?.AddBottle(1);

        // Play SFX at position (2D so it never cuts off)
        if (pickupSfx) AudioSource.PlayClipAtPoint(pickupSfx, transform.position, sfxVolume);

        // Hide instantly, then destroy
        rootToDestroy.SetActive(false);
        Destroy(rootToDestroy, destroyDelay);
    }
}
