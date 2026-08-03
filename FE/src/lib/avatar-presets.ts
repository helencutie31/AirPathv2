export type AvatarPresetId = "gym" | "yoga" | "park" | "fresh-air" | "running" | "meadow";

export type AvatarFrameId = "emerald" | "sky" | "yellow" | "rose" | "purple" | "orange";

export type AvatarSelection = {
  avatarId: AvatarPresetId;
  frameId: AvatarFrameId;
};

export type AvatarPreset = {
  id: AvatarPresetId;
  label: string;
  src: string;
  fallbackSrc: string;
};

export type AvatarFrame = {
  id: AvatarFrameId;
  label: string;
  color: string;
  glow: string;
};

const toDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

function buildSvg(backgroundA: string, backgroundB: string, foreground: string, body: string) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${backgroundA}" />
          <stop offset="100%" stop-color="${backgroundB}" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="80" fill="url(#bg)" />
      ${body}
      <circle cx="80" cy="80" r="67" fill="none" stroke="${foreground}" stroke-opacity="0.16" stroke-width="4" />
    </svg>
  `;
}

export const avatarPresets: AvatarPreset[] = [
  {
    id: "gym",
    label: "John Cena",
    src: "https://thumbs.dreamstime.com/b/muscled-male-model-showing-his-back-bodybuilder-biceps-muscles-personal-fitness-trainer-strong-man-flexing-muscles-78933810.jpg",
    fallbackSrc: toDataUri(
      buildSvg(
        "#0f766e",
        "#22c55e",
        "#f8fafc",
        `
          <rect x="34" y="67" width="22" height="8" rx="4" fill="#f8fafc" opacity="0.95" />
          <rect x="104" y="67" width="22" height="8" rx="4" fill="#f8fafc" opacity="0.95" />
          <rect x="56" y="61" width="48" height="20" rx="8" fill="#e2e8f0" />
          <rect x="50" y="53" width="8" height="36" rx="4" fill="#f8fafc" />
          <rect x="102" y="53" width="8" height="36" rx="4" fill="#f8fafc" />
        `,
      ),
    ),
  },
  {
    id: "yoga",
    label: "Puppy",
    src: "https://thumbs.dreamstime.com/b/young-women-yoga-class-doing-meditation-lotus-pose-group-healthy-people-meditating-yoga-studio-healthy-people-doing-102079220.jpg",
    fallbackSrc: toDataUri(
      buildSvg(
        "#7c3aed",
        "#a855f7",
        "#f8fafc",
        `
          <circle cx="80" cy="48" r="12" fill="#f8fafc" />
          <path d="M63 90c5-15 29-15 34 0" fill="none" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
          <path d="M52 112c12-10 44-10 56 0" fill="none" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
          <path d="M80 60v25" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
        `,
      ),
    ),
  },
  {
    id: "park",
    label: "Cycling",
    src: "https://thumbs.dreamstime.com/b/tour-de-france-10094407.jpg",
    fallbackSrc: toDataUri(
      buildSvg(
        "#166534",
        "#4ade80",
        "#f8fafc",
        `
          <path d="M80 34c-16 0-29 13-29 29 0 11 6 20 15 25-1 13-1 24-1 24h30s0-11-1-24c9-5 15-14 15-25 0-16-13-29-29-29z" fill="#f8fafc" opacity="0.95" />
          <circle cx="80" cy="64" r="15" fill="#22c55e" opacity="0.92" />
          <rect x="73" y="90" width="14" height="28" rx="4" fill="#f8fafc" />
        `,
      ),
    ),
  },
  {
    id: "fresh-air",
    label: "Cat",
    src: "https://thumbs.dreamstime.com/b/running-gym-group-young-people-treadmill-30717981.jpg",
    fallbackSrc: toDataUri(
      buildSvg(
        "#0ea5e9",
        "#67e8f9",
        "#f8fafc",
        `
          <circle cx="56" cy="76" r="16" fill="#f8fafc" opacity="0.96" />
          <circle cx="78" cy="68" r="20" fill="#f8fafc" opacity="0.96" />
          <circle cx="100" cy="76" r="16" fill="#f8fafc" opacity="0.96" />
          <path d="M42 94h68" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
          <path d="M44 54c10-10 26-10 36 0" stroke="#f8fafc" stroke-width="8" stroke-linecap="round" fill="none" />
          <path d="M84 54c8-8 20-8 28 0" stroke="#f8fafc" stroke-width="8" stroke-linecap="round" fill="none" />
        `,
      ),
    ),
  },
  {
    id: "running",
    label: "Running",
    src: "https://thumbs.dreamstime.com/b/golden-retriever-dog-21668976.jpg",
    fallbackSrc: toDataUri(
      buildSvg(
        "#ea580c",
        "#fb923c",
        "#f8fafc",
        `
          <circle cx="98" cy="42" r="12" fill="#f8fafc" />
          <path d="M90 56l-18 14 12 14 16-10 12 18" fill="none" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M72 84l-18 20" fill="none" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
          <path d="M86 84l8 20" fill="none" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
          <path d="M92 70l18 4" fill="none" stroke="#f8fafc" stroke-width="10" stroke-linecap="round" />
        `,
      ),
    ),
  },
  {
    id: "meadow",
    label: "Meadow",
    src: "https://thumbs.dreamstime.com/b/pet-cat-green-cats-eyes-gray-big-102425920.jpg",
    fallbackSrc: toDataUri(
      buildSvg(
        "#2563eb",
        "#86efac",
        "#f8fafc",
        `
          <rect x="0" y="86" width="160" height="74" fill="#86efac" opacity="0.9" />
          <rect x="0" y="0" width="160" height="86" fill="#dbeafe" opacity="0.85" />
          <circle cx="122" cy="36" r="16" fill="#fef08a" opacity="0.95" />
          <path d="M18 106c18-18 36-18 54 0 16-20 38-20 54 0 10-12 22-18 34-18v68H0v-50c8 0 14 0 18 0z" fill="#22c55e" opacity="0.92" />
          <path d="M0 120c22-14 40-14 58 0 18-14 38-14 60 0 18-10 28-12 42-8" fill="none" stroke="#f8fafc" stroke-width="3" opacity="0.8" />
        `,
      ),
    ),
  },
];

export const avatarFrames: AvatarFrame[] = [
  { id: "emerald", label: "Emerald", color: "#117843", glow: "rgba(17, 120, 67, 0.28)" },
  { id: "sky", label: "Sky", color: "#0284c7", glow: "rgba(2, 132, 199, 0.28)" },
  { id: "yellow", label: "Yellow", color: "#eab308", glow: "rgba(234, 179, 8, 0.28)" },
  { id: "rose", label: "Rose", color: "#e11d48", glow: "rgba(225, 29, 72, 0.28)" },
  { id: "purple", label: "Purple", color: "#9333ea", glow: "rgba(147, 51, 234, 0.28)" },
  { id: "orange", label: "Orange", color: "#f97316", glow: "rgba(249, 115, 22, 0.28)" },
];

export const defaultAvatarSelection: AvatarSelection = {
  avatarId: "running",
  frameId: "emerald",
};

export function getAvatarPreset(avatarId: AvatarPresetId) {
  return avatarPresets.find((preset) => preset.id === avatarId) ?? avatarPresets[0];
}

export function getAvatarFrame(frameId: AvatarFrameId) {
  return avatarFrames.find((frame) => frame.id === frameId) ?? avatarFrames[0];
}

export function getAvatarSelectionStyle(selection: AvatarSelection | null | undefined) {
  const resolvedSelection = selection ?? defaultAvatarSelection;
  const frame = getAvatarFrame(resolvedSelection.frameId);

  return {
    backgroundImage: `url("${getAvatarPreset(resolvedSelection.avatarId).src}")`,
    boxShadow: `0 0 0 4px ${frame.color}`,
  };
}

export function getAvatarStorageKey(userId: string) {
  return `airparth:avatar:${userId}`;
}

export function loadAvatarSelection(userId: string): AvatarSelection {
  if (typeof window === "undefined") {
    return defaultAvatarSelection;
  }

  try {
    const raw = window.localStorage.getItem(getAvatarStorageKey(userId));
    if (!raw) {
      return defaultAvatarSelection;
    }

    const parsed = JSON.parse(raw) as Partial<AvatarSelection>;
    if (
      (parsed.avatarId === "gym" || parsed.avatarId === "yoga" || parsed.avatarId === "park" || parsed.avatarId === "fresh-air" || parsed.avatarId === "running" || parsed.avatarId === "meadow") &&
      (parsed.frameId === "emerald" || parsed.frameId === "sky" || parsed.frameId === "yellow" || parsed.frameId === "rose" || parsed.frameId === "purple" || parsed.frameId === "orange")
    ) {
      return { avatarId: parsed.avatarId, frameId: parsed.frameId };
    }
  } catch {
    // Ignore malformed local avatar data.
  }

  return defaultAvatarSelection;
}

export function saveAvatarSelection(userId: string, selection: AvatarSelection) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getAvatarStorageKey(userId), JSON.stringify(selection));
}