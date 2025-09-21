using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Animator))]
public class Elder2Controller : MonoBehaviour
{
    [Header("Refs")]
    public Animator animator;              // auto-wires if left empty
    public Transform player;

    [Header("Proximity")]
    public float triggerDistance = 3f;     // start sequence when player is this close

    [Header("Revive (Sugar)")]
    public KeyCode reviveKey = KeyCode.M;  // hold to revive
    public float holdSecondsToRevive = 3f; // continuous hold required
    public float reviveWindow = 8f;        // time allowed while in LAY

    [Header("Animator State Names")]
    public string idleState = "idle";
    public string dizzyState = "milddizzy";
    public string fallState  = "fall";
    public string layState   = "lay";
    public string dieState   = "die";

    [Header("Animator Parameters (Triggers)")]
    public string pNear   = "Near";        // idle -> milddizzy
    public string pRevive = "Revive";      // lay  -> idle
    public string pDie    = "Die";         // lay  -> die

    [Header("Audio (optional)")]
    public AudioSource audioSource;        // optional; auto-get if present
    public AudioClip fallSfx;              // plays when fall starts
    [Range(0f,1f)] public float fallSfxVolume = 1f;

    // internals
    bool sequenceStarted;
    bool alreadyRevived;
    bool fallSfxPlayed;

    int fallHash, layHash, dieHash;

    void Awake()
    {
        if (!animator) animator = GetComponent<Animator>();
        if (!audioSource) audioSource = GetComponent<AudioSource>();

        fallHash = Animator.StringToHash(fallState);
        layHash  = Animator.StringToHash(layState);
        dieHash  = Animator.StringToHash(dieState);

        animator.applyRootMotion = false; // avoid sinking on imported clips
    }

    void Update()
    {
        if (!animator || !player) return;
        if (alreadyRevived || sequenceStarted) return;

        if (Vector3.Distance(player.position, transform.position) <= triggerDistance)
        {
            animator.SetTrigger(pNear);  // idle -> milddizzy (Animator handles dizzy->fall->lay by exit time)
            sequenceStarted = true;
            StartCoroutine(RunSequence());
        }
    }

    IEnumerator RunSequence()
    {
        // Wait until entering 'fall' to play SFX once
        yield return new WaitUntil(() => IsInState(fallHash));
        if (!fallSfxPlayed && audioSource && fallSfx)
        {
            audioSource.PlayOneShot(fallSfx, fallSfxVolume);
            fallSfxPlayed = true;
        }

        // Then wait until we are actually in 'lay'
        yield return new WaitUntil(() => IsInState(layHash));

        float window = 0f;
        float held   = 0f;

        while (window < reviveWindow && !IsInState(dieHash))
        {
            window += Time.deltaTime;

            bool near = Vector3.Distance(player.position, transform.position) <= triggerDistance;
            bool hasSugar = CollectiblesTracker.Instance && CollectiblesTracker.Instance.Sugar > 0;

            // Only accumulate while near, holding M, and at least 1 sugar available
            if (near && hasSugar && Input.GetKey(reviveKey))
                held += Time.deltaTime;   // must be continuous
            else
                held = 0f;

            if (held >= holdSecondsToRevive)
            {
                // Spend one sugar atomically before reviving
                if (CollectiblesTracker.Instance != null && CollectiblesTracker.Instance.TrySpendSugar(1))
                {
                    animator.ResetTrigger(pDie);
                    animator.SetTrigger(pRevive); // lay -> idle
                    LivesTracker.Instance?.AddSaved();
                    alreadyRevived = true;        // never fall again this session
                    enabled = false;
                    yield break;
                }
                else
                {
                    // Ran out right at the end; require another full hold once sugar is available
                    held = 0f;
                }
            }

            yield return null;
        }

        // Failed to revive within the window -> die
        if (!IsInState(dieHash))
        {
            animator.SetTrigger(pDie);    // lay -> die
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
