using UnityEngine;

[RequireComponent(typeof(CharacterController))]
[RequireComponent(typeof(Animator))]
public class NathanController : MonoBehaviour
{
    [Header("Movement")]
    public float moveSpeed = 5f;
    public float rotationSpeed = 120f;
    public float gravity = -9.81f;
    public float jumpHeight = 1.5f;
    public float inputBufferSeconds = 0.2f;

    const string ST_RUN="run", ST_CPR="cpr", ST_FEED="feed";
    const string TRG_RUN="Run", TRG_CPR="CPR", TRG_FEED="Feed";

    CharacterController controller;
    Animator animator;
    Vector3 velocity;
    bool isGrounded;

    enum Pending { None, Run, CPR, Feed }
    Pending pendingAction = Pending.None;
    float pendingUntil = 0f;

    // Raise threshold to ignore tiny input noise
    const float MOVE_EPS = 0.15f;

    // Short lock to prevent Run from instantly canceling an action we just started
    float actionLockTimer = 0f;
    const float ACTION_LOCK_DURATION = 0.15f;

    void Awake() { controller = GetComponent<CharacterController>(); animator = GetComponent<Animator>(); }
    void Start() { animator.SetTrigger(TRG_RUN); }

    void Update()
    {
        if (actionLockTimer > 0f) actionLockTimer -= Time.deltaTime;

        var st = animator.GetCurrentAnimatorStateInfo(0);
        bool inAction = st.IsName(ST_CPR) || st.IsName(ST_FEED);
        bool inTransition = animator.IsInTransition(0);

        float v = Input.GetAxis("Vertical");
        float h = Input.GetAxis("Horizontal");
        bool wantsMove = Mathf.Abs(v) > MOVE_EPS || Mathf.Abs(h) > MOVE_EPS;

        // --- Action hotkeys (IMMEDIATE, higher priority than Run) ---
        if (Input.GetKeyDown(KeyCode.C))  StartAction(Pending.CPR);
        if (Input.GetKeyDown(KeyCode.N) || Input.GetKeyDown(KeyCode.M)) StartAction(Pending.Feed);

        // --- Buffer Run only if not action-locked and no action was just requested ---
        if (actionLockTimer <= 0f && pendingAction == Pending.None && wantsMove)
            Buffer(Pending.Run);

        // Consume buffered action when safe (or immediately if not transitioning)
        TryConsumeBuffer(!inTransition);

        // Movement only if not in action
        inAction = IsInAction();
        if (!inAction)
        {
            Vector3 move = transform.forward * v;
            controller.Move(move * moveSpeed * Time.deltaTime);
            transform.Rotate(Vector3.up * h * rotationSpeed * Time.deltaTime);
        }

        // Jump (optional)
        if (!inAction && Input.GetButtonDown("Jump") && isGrounded)
            velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);

        // Gravity
        isGrounded = controller.isGrounded;
        if (isGrounded && velocity.y < 0) velocity.y = -2f;
        velocity.y += gravity * Time.deltaTime;
        controller.Move(velocity * Time.deltaTime);
    }

    bool IsInAction()
    {
        var st = animator.GetCurrentAnimatorStateInfo(0);
        return st.IsName(ST_CPR) || st.IsName(ST_FEED);
    }

    // Actions get buffered with priority over Run
    void StartAction(Pending a)
    {
        pendingAction = a;                       // overwrite any pending Run
        pendingUntil  = Time.time + inputBufferSeconds;
    }

    void Buffer(Pending a)
    {
        // Don't override a pending action with Run
        if (pendingAction == Pending.CPR || pendingAction == Pending.Feed) return;
        pendingAction = a;
        pendingUntil  = Time.time + inputBufferSeconds;
    }

    void TryConsumeBuffer(bool canFireNow)
    {
        if (pendingAction == Pending.None) return;
        if (Time.time > pendingUntil) { pendingAction = Pending.None; return; }
        if (!canFireNow) return;

        switch (pendingAction)
        {
            case Pending.Run:  DoRun();  break;
            case Pending.CPR:  DoCPR();  break;
            case Pending.Feed: DoFeed(); break;
        }
        pendingAction = Pending.None;
    }

    void DoRun()
    {
        animator.ResetTrigger(TRG_CPR);
        animator.ResetTrigger(TRG_FEED);
        animator.SetTrigger(TRG_RUN);
        // animator.CrossFade(ST_RUN, 0.05f, 0, 0f);
    }

    void DoCPR()
    {
        animator.ResetTrigger(TRG_FEED);
        animator.ResetTrigger(TRG_RUN);
        animator.SetTrigger(TRG_CPR);
        animator.CrossFade(ST_CPR, 0.05f, 0, 0f); // force-enter CPR now
        actionLockTimer = ACTION_LOCK_DURATION;   // ignore Run briefly
    }

    void DoFeed()
    {
        animator.ResetTrigger(TRG_CPR);
        animator.ResetTrigger(TRG_RUN);
        animator.SetTrigger(TRG_FEED);
        animator.CrossFade(ST_FEED, 0.05f, 0, 0f);
        actionLockTimer = ACTION_LOCK_DURATION;
    }
}
