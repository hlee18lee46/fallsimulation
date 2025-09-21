using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Animator))]
public class Elder4Controller : MonoBehaviour
{
    [Header("Refs")]
    public Animator animator;                  // auto-wired if left empty
    public Transform player;

    [Header("Proximity")]
    public float triggerDistance = 3f;

    [Header("Bottle Revive")]
    public KeyCode reviveKey = KeyCode.N;      // hold to revive
    public float bottleHoldSeconds = 3f;       // continuous hold required
    public float reviveWindow = 8f;            // time allowed while in LAY

    [Header("Animator State Names")]
    public string idleState = "idle";
    public string dizzyState = "dizzy";        // used by your controller; script just waits for lay
    public string fallState  = "fall";
    public string layState   = "lay";
    public string dieState   = "die";

    [Header("Animator Parameters (Triggers)")]
    public string pNear   = "Near";            // idle -> dizzy
    public string pRevive = "Revive";          // lay  -> idle
    public string pDie    = "Die";             // lay  -> die

    [Header("Audio (optional)")]
    public AudioSource audioSource;            // optional; auto-get if present
    public AudioClip fallSfx;                  // plays when fall starts
    [Range(0f,1f)] public float fallSfxVolume = 1f;

    // internals
    bool sequenceStarted;
    bool alreadyRevived;                       // once saved, never fall again
    bool fallSfxPlayed;

    int fallHash, layHash, dieHash;

    void Awake()
    {
        if (!animator) animator = GetComponent<Animator>();
        if (!audioSource) audioSource = GetComponent<AudioSource>();

        fallHash = Animator.StringToHash(fallState);
        layHash  = Animator.StringToHash(layState);
        dieHash  = Animator.StringToHash(dieState);

        animator.applyRootMotion = false; // avoid sinking
    }

    void Update()
    {
        if (!animator || !player) return;
        if (alreadyRevived || sequenceStarted) return;

        if (Vector3.Distance(player.position, transform.position) <= triggerDistance)
        {
            animator.SetTrigger(pNear); // idle -> dizzy (Animator handles dizzy->fall->lay)
            sequenceStarted = true;
            StartCoroutine(RunSequence());
        }
    }

    IEnumerator RunSequence()
    {
        // Wait until entering 'fall' once to play SFX
        yield return new WaitUntil(() => IsInState(fallHash));
        if (!fallSfxPlayed && audioSource && fallSfx)
        {
            audioSource.PlayOneShot(fallSfx, fallSfxVolume);
            fallSfxPlayed = true;
        }

        // Wait until we're actually in 'lay'
        yield return new WaitUntil(() => IsInState(layHash));

        float window = 0f;
        float held   = 0f;

        while (window < reviveWindow && !IsInState(dieHash))
        {
            window += Time.deltaTime;

            bool near = Vector3.Distance(player.position, transform.position) <= triggerDistance;
            bool hasBottle = CollectiblesTracker.Instance && CollectiblesTracker.Instance.Bottles > 0;

            // Only accumulate while near, holding N, and at least 1 bottle available
            if (near && hasBottle && Input.GetKey(reviveKey))
                held += Time.deltaTime;
            else
                held = 0f; // must be continuous

            if (held >= bottleHoldSeconds)
            {
                // Spend one bottle atomically before reviving
                if (CollectiblesTracker.Instance != null && CollectiblesTracker.Instance.TrySpendBottle(1))
                {
                    animator.ResetTrigger(pDie);
                    animator.SetTrigger(pRevive);   // lay -> idle
                    LivesTracker.Instance?.AddSaved();
                    alreadyRevived = true;
                    enabled = false;                // no future falls
                    yield break;
                }
                else
                {
                    // Ran out right at the end; require another continuous hold once bottle is available
                    held = 0f;
                }
            }

            yield return null;
        }

        // Failed to revive within the window -> die
        if (!IsInState(dieHash))
        {
            animator.SetTrigger(pDie);              // lay -> die
            LivesTracker.Instance?.AddLost();
        }
        enabled = false;
    }

    bool IsInState(int stateHash, int layer = 0)
    {
        var info = animator.GetCurrentAnimatorStateInfo(layer);
        return info.shortNameHash == stateHash;
    }
}
