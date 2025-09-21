using UnityEngine;

[RequireComponent(typeof(Collider))]
public class PickupOnTrigger : MonoBehaviour
{
    public enum PickupType { Sugar, Bottle }
    public PickupType type = PickupType.Sugar;

    [Tooltip("If left empty, this GameObject will be destroyed after pickup.")]
    public GameObject rootToDestroy;

    [Header("Optional SFX")]
    public AudioSource audioSource; // optional (plays at pickup position)
    public AudioClip pickupSfx;
    [Range(0f,1f)] public float sfxVolume = 1f;

    void Awake()
    {
        // ensure we have a trigger collider
        var col = GetComponent<Collider>();
        col.isTrigger = true;

        if (!rootToDestroy) rootToDestroy = gameObject;
        if (!audioSource)  audioSource = GetComponent<AudioSource>();
    }

    void OnTriggerEnter(Collider other)
    {
        // Only the player collects
        if (!other.CompareTag("Player")) return;

        // Count it
        if (type == PickupType.Sugar)
            CollectiblesTracker.Instance?.AddSugar(1);
        else
            CollectiblesTracker.Instance?.AddBottle(1);

        // Optional SFX (no need to keep the object around)
        if (audioSource && pickupSfx)
            audioSource.PlayOneShot(pickupSfx, sfxVolume);

        // Destroy the pickup (use root so you clean up the visual mesh, child colliders, etc.)
        Destroy(rootToDestroy);
    }
}

