using UnityEngine;

[RequireComponent(typeof(Camera))]
public class CameraFollow : MonoBehaviour
{
    public enum ViewMode { Normal, Face, Far, FarFace }

    [Header("Target")]
    public Transform target;
    public bool useRigidbodyVelocity = true;
    public Rigidbody targetRigidbody;

    [Header("Offsets (Normal View)")]
    [Tooltip("If true, offset is in target's local space (Z<0 = behind). If false, world space.")]
    public bool offsetIsLocal = true;
    public Vector3 offset = new Vector3(0f, 2.5f, -4f);
    public float orthoSize2D = 6f;
    public bool matchTargetRotation = false;

    [Header("Aim")]
    public float aimHeight = 1.6f;
    public float aimDamping = 8f;

    [Header("Smoothing")]
    public float smoothTime = 0.18f;
    private Vector3 _velocity;

    [Header("Dead Zone (screen-space)")]
    public Vector2 deadZonePixels = new Vector2(80f, 60f);

    [Header("Look-Ahead")]
    public float lookAheadDistance = 2.0f;
    public float lookAheadSmoothing = 0.25f;

    [Header("Bounds (world-space)")]
    public bool clampToBounds = false;
    public Vector2 minBounds = new Vector2(-100f, -100f);
    public Vector2 maxBounds = new Vector2(100f, 100f);
    public float boundsPadding = 0.5f;

    [Header("Collision (3D)")]
    public bool avoidWalls = false;
    public LayerMask collisionMask = ~0;
    public float collisionRadius = 0.3f;

    // ===== View Modes =====
    [Header("View Toggle")]
    public KeyCode toggleKey = KeyCode.X;
    public ViewMode view = ViewMode.Normal;

    [Header("Face View (close, in front)")]
    [Tooltip("How far IN FRONT of the player the face view sits.")]
    public float frontDistance = 6.0f;
    [Tooltip("Vertical height for the face view. 0 = use aimHeight.")]
    public float frontHeightOverride = 1.6f;

    [Header("Far / Cinematic View (angled around)")]
    [Tooltip("Distance from player for the far cinematic shot.")]
    public float farDistance = 20f;
    [Tooltip("Height above ground for the far cinematic shot.")]
    public float farHeight = 10f;
    [Tooltip("Yaw around the player in degrees. 0 = directly behind, 90 = side view.")]
    public float farYawDegrees = 45f;

    [Header("FarFace / Drone Front View (far, in front)")]
    [Tooltip("Distance from player when far and facing (drone in FRONT, looking back).")]
    public float farFaceDistance = 26f;
    [Tooltip("Height for the far front view.")]
    public float farFaceHeight = 12f;
    [Tooltip("Yaw around the player while still in front (e.g., 20° for angled front).")]
    public float farFaceYawDegrees = 20f;

    [Header("FOV per View")]
    public float normalFOV = 60f;
    public float faceFOV = 45f;
    public float farFOV = 35f;
    public float farFaceFOV = 40f;
    public float fovLerpSpeed = 8f;

    private Camera _cam;
    private Vector3 _lookAhead;
    private Vector3 _desiredPos;

    void Awake()
    {
        _cam = GetComponent<Camera>();
        if (_cam.orthographic) _cam.orthographicSize = orthoSize2D;

        if (target == null) Debug.LogWarning("[CameraFollow] No target assigned.");
        if (useRigidbodyVelocity && targetRigidbody == null && target != null)
            targetRigidbody = target.GetComponent<Rigidbody>();

        if (normalFOV > 0f && !_cam.orthographic) _cam.fieldOfView = normalFOV;
    }

    void LateUpdate()
    {
        if (target == null) return;

        // Cycle: Normal -> Face -> Far -> FarFace -> Normal...
        if (Input.GetKeyDown(toggleKey))
        {
            view = (ViewMode)(((int)view + 1) % 4);
        }

        _lookAhead = ComputeLookAhead();

        // Compute wanted position for each view
        Vector3 wanted;

        switch (view)
        {
            case ViewMode.Face:
            {
                float h = (frontHeightOverride > 0f) ? frontHeightOverride : aimHeight;
                // In front of player, look back
                wanted = target.TransformPoint(new Vector3(0f, 0f, frontDistance)) + Vector3.up * h;
                break;
            }
            case ViewMode.Far:
            {
                // Around-the-player angle (behind/side-ish)
                Vector3 dir = Quaternion.AngleAxis(farYawDegrees, Vector3.up) * target.forward;
                wanted = target.position - dir.normalized * farDistance + Vector3.up * farHeight;
                break;
            }
            case ViewMode.FarFace:
            {
                // In FRONT but far, with optional yaw for angled front
                Vector3 dirFront = Quaternion.AngleAxis(farFaceYawDegrees, Vector3.up) * target.forward;
                wanted = target.position + dirFront.normalized * farFaceDistance + Vector3.up * farFaceHeight;
                break;
            }
            default: // Normal
            {
                if (offsetIsLocal)
                    wanted = target.TransformPoint(_lookAhead + offset);
                else
                    wanted = target.position + _lookAhead + offset;
                break;
            }
        }

        if (matchTargetRotation)
            transform.rotation = Quaternion.Lerp(transform.rotation, target.rotation, Time.deltaTime * 5f);

        // Smooth follow
        _desiredPos = Vector3.SmoothDamp(transform.position, wanted, ref _velocity, smoothTime);

        // Collision handling
        if (avoidWalls)
            _desiredPos = ResolveCollision(target.position, _desiredPos);

        // Bounds
        if (clampToBounds)
            _desiredPos = ClampToWorldBounds(_desiredPos);

        transform.position = _desiredPos;

        // Keep Z stable for orthographic 2D
        if (_cam.orthographic && Mathf.Abs(offset.z) > 0.01f)
        {
            var p = transform.position;
            p.z = target.position.z + offset.z;
            transform.position = p;
        }

        // Aim at the player for all views (so “facing” always looks back at them)
        float aimH =
            (view == ViewMode.Face  && frontHeightOverride > 0f) ? frontHeightOverride :
            (view == ViewMode.FarFace ? Mathf.Max(farFaceHeight * 0.8f, aimHeight) : aimHeight);

        Vector3 lookTarget = target.position + Vector3.up * aimH;
        Quaternion lookRot = Quaternion.LookRotation(lookTarget - transform.position, Vector3.up);
        transform.rotation = Quaternion.Slerp(transform.rotation, lookRot, Time.deltaTime * aimDamping);

        // FOV per mode (perspective cams)
        if (!_cam.orthographic)
        {
            float targetFOV =
                view == ViewMode.FarFace ? farFaceFOV :
                view == ViewMode.Far     ? farFOV :
                view == ViewMode.Face    ? faceFOV :
                                            normalFOV;
            if (targetFOV > 0f)
                _cam.fieldOfView = Mathf.Lerp(_cam.fieldOfView, targetFOV, Time.deltaTime * fovLerpSpeed);
        }
    }

    Vector3 ComputeLookAhead()
    {
        Vector3 vel = Vector3.zero;
        if (useRigidbodyVelocity && targetRigidbody != null)
            vel = targetRigidbody.linearVelocity;
        else
            vel = (target.hasChanged ? target.forward : Vector3.zero);

        if (!_cam.orthographic) vel.y = 0f;

        return Vector3.Lerp(
            _lookAhead,
            vel.normalized * lookAheadDistance,
            Time.deltaTime / Mathf.Max(0.0001f, lookAheadSmoothing)
        );
    }

    Vector3 ResolveCollision(Vector3 focus, Vector3 desired)
    {
        Vector3 dir = desired - focus;
        float dist = dir.magnitude;
        if (dist < 0.001f) return desired;

        dir /= dist;
        if (Physics.SphereCast(focus, collisionRadius, dir, out RaycastHit hit, dist, collisionMask, QueryTriggerInteraction.Ignore))
        {
            return hit.point - dir * boundsPadding;
        }
        return desired;
    }

    Vector3 ClampToWorldBounds(Vector3 pos)
    {
        if (_cam.orthographic)
        {
            float vertExtent = _cam.orthographicSize;
            float horzExtent = vertExtent * _cam.aspect;

            pos.x = Mathf.Clamp(pos.x, minBounds.x + horzExtent + boundsPadding, maxBounds.x - horzExtent - boundsPadding);
            pos.y = Mathf.Clamp(pos.y, minBounds.y + vertExtent + boundsPadding, maxBounds.y - vertExtent - boundsPadding);
        }
        else
        {
            pos.x = Mathf.Clamp(pos.x, minBounds.x + boundsPadding, maxBounds.x - boundsPadding);
            pos.z = Mathf.Clamp(pos.z, minBounds.y + boundsPadding, maxBounds.y - boundsPadding);
        }
        return pos;
    }

#if UNITY_EDITOR
    void OnDrawGizmosSelected()
    {
        if (!clampToBounds) return;
        Gizmos.color = Color.yellow;

        if (_cam != null && _cam.orthographic)
        {
            Vector3 center = new Vector3(
                (minBounds.x + maxBounds.x) * 0.5f,
                (minBounds.y + maxBounds.y) * 0.5f,
                (target ? target.position.z + offset.z : transform.position.z)
            );
            Vector3 size = new Vector3(maxBounds.x - minBounds.x, maxBounds.y - minBounds.y, 0.1f);
            Gizmos.DrawWireCube(center, size);
        }
        else
        {
            float y = target ? target.position.y : 0f;
            Vector3 a = new Vector3(minBounds.x, y, minBounds.y);
            Vector3 b = new Vector3(maxBounds.x, y, minBounds.y);
            Vector3 c = new Vector3(maxBounds.x, y, maxBounds.y);
            Vector3 d = new Vector3(minBounds.x, y, maxBounds.y);
            Gizmos.DrawLine(a, b); Gizmos.DrawLine(b, c); Gizmos.DrawLine(c, d); Gizmos.DrawLine(d, a);
        }
    }
#endif
}
