import * as THREE from "three";

/**
 * Scene constants.
 *
 * The camera used to dolly along a generated path derived from the resume and
 * project data. That data — and the telemetry wall it drove — has been removed,
 * and the head is now static in world space, so the camera is fixed too.
 */

/** Where the camera sits. Static: the sequence plays out in front of it. */
export const CAMERA_POSITION = new THREE.Vector3(0, 1.6, 6.4);

/** What the camera looks at — the centre of the particle field. */
export const CAMERA_TARGET = new THREE.Vector3(0, 1.5, 0);

/** Fixed world position of the particle field (head, then trees). */
export const FIELD_POSITION = new THREE.Vector3(0, 1.5, 0);
