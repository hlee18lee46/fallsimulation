using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Animator))]
public class Elder1Controller : MonoBehaviour
{
    [Header("Refs")]
    public Animator animator;        // auto-wired
    public Transform player;

    [Header("CPR")]
    public KeyCode cprKey = KeyCode.C;
    public float triggerDistance = 3f;
    public float cprHoldSeconds = 3f;
    public float reviveWindow   = 8f;

    [Header("Animator names")]
    public string idleState = "idle";
    public string fallState = "fall";
    public string layState  = "lay";
    public string dieState  = "die";
    public string pFall   = "Fall";
    public string pRevive = "Revive";
    public string pDie    = "Die";

    [Header("SFX (optional)")]
    public AudioSource audioSource;
    public AudioClip fallSfx;
    [Range(0,1)] public float fallSfxVolume = 1f;

    bool started;          // fall triggered
    bool finished;         // saved or died (prevents double count)

    int fallHash, layHash, dieHash;

    void Awake()
    {
        if (!animator) animator = GetComponent<Animator>();
        if (!audioSource) audioSource = GetComponent<AudioSource>();
        animator.applyRootMotion = false;

        fallHash = Animator.StringToHash(fallState);
        layHash  = Animator.StringToHash(layState);
        dieHash  = Animator.StringToHash(dieState);
    }

    void Update()
    {
        if (finished || started || !player) return;

        if (Vector3.Distance(player.position, transform.position) <= triggerDistance)
        {
            animator.SetTrigger(pFall); // idle -> fall
            started = true;

            if (audioSource && fallSfx) audioSource.PlayOneShot(fallSfx, fallSfxVolume);
            StartCoroutine(LayPhase());
        }
    }

    IEnumerator LayPhase()
    {
        // wait until we’re actually in LAY after fall
        yield return new WaitUntil(() => IsInState(layHash));

        float window = 0f;
        float held   = 0f;

        while (window < reviveWindow && !IsInState(dieHash))
        {
            window += Time.deltaTime;

            bool near = Vector3.Distance(player.position, transform.position) <= triggerDistance;
            if (near && Input.GetKey(cprKey)) held += Time.deltaTime;
            else                              held  = 0f; // must be continuous

            if (held >= cprHoldSeconds)
            {
                animator.ResetTrigger(pDie);
                animator.SetTrigger(pRevive);         // lay -> idle
                if (!finished) LivesTracker.Instance?.AddSaved();
                finished = true;
                enabled  = false;                      // don’t re-run logic
                yield break;
            }
            yield return null;
        }

        // window expired -> die
        if (!IsInState(dieHash))
        {
            animator.SetTrigger(pDie);                // lay -> die
            if (!finished) LivesTracker.Instance?.AddLost();
        }
        finished = true;
        enabled  = false;
    }

    bool IsInState(int shortNameHash, int layer = 0)
    {
        var info = animator.GetCurrentAnimatorStateInfo(layer);
        return info.shortNameHash == shortNameHash;
    }
}
