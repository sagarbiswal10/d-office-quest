# Cyber Raid gameplay and 3D office overhaul

## Goal
Turn the uploaded prototype into a slower, interactive security-operations game that ends successfully only after the player contains every planned threat, while replacing tiring hand gestures with comfortable controls and placing the network inside a complete 3D office.

## Implementation

### 1. Import and stabilize the uploaded game
- Bring the uploaded source into this project without its Git history, generated files, or macOS metadata.
- Preserve the existing cyber-defense concept, score, audio, leaderboard, and visual identity.
- Fix unsafe state access, replay/result duplication, timer accuracy, selection edge cases, and controls that can fire accidentally.

### 2. Rework mission pacing and completion
- Replace endless random spawning with a finite campaign covering all five threat types.
- Introduce threats in paced waves with a calm opening, readable pauses between alerts, and gradually rising pressure.
- Slow infection growth and spread so players have time to select, investigate, and isolate each device deliberately.
- Show clear progress such as “Threats contained 3/5” and the current incident objective.
- Finish with a victory only when all planned threats have appeared and every active infection is contained.
- Keep network integrity loss as the failure condition; remove the timer as an automatic mission-ending condition and use elapsed time for performance scoring instead.

### 3. Replace gesture-only isolation
- Remove webcam hand-tracking as a required play mode.
- Make every action available through large click/tap controls and comfortable keyboard shortcuts.
- Add an explicit two-step response flow: select a device, investigate it, then press or click Isolate.
- Disable unavailable actions and provide immediate visual feedback so accidental healthy-device penalties are avoided.

### 4. Build the 3D SOC office
- Replace the empty grid background with a navigable, full 3D operations room: floor, walls, ceiling lights, windows, desks, operator chairs, wall displays, network racks, cabling, and room-scale lighting.
- Source compact CC0 3D models for recognizable server racks and office equipment, validate them locally, and load them inside guarded fallbacks so missing assets cannot blank the game.
- Keep the network devices prominent and interactive within the room, with readable status lights, threat effects, selection rings, and containment feedback.
- Use an accessible camera angle with restrained orbit controls and mobile-friendly framing.

### 5. Refine the interface
- Update the mission screen, status display, action controls, briefing, and results copy to match the finite campaign.
- Preserve clear contrast over the busier office scene while reducing visual clutter.
- Add pause/restart behavior and ensure controls fit desktop and mobile screens without overlap.

### 6. Verify
- Validate the complete loop: start, select, investigate, isolate, firewall, paced waves, failure, victory after all threats, restart, and leaderboard entry.
- Check the 3D scene at desktop and mobile sizes, including model loading, lighting, camera framing, object selection, and text fit.
- Confirm the page builds cleanly with no runtime, console, network, or hydration errors.

## Technical details
- Use React Three Fiber and Drei for the office and interaction scene.
- Keep gameplay state in the existing Zustand store, with an explicit campaign state machine and delta-time updates.
- Use compact locally hosted CC0 GLB assets for named office/server objects; procedural geometry remains appropriate for room architecture, cables, and abstract threat effects.
- Keep the game client-only and retain route-specific metadata.
