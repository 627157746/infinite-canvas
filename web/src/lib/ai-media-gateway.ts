import { channelIdForActiveModel, localChannelForActiveModel, type AiConfig, type ModelCapabilities, type ModelCapability } from "@/stores/use-config-store";

// AI Media Gateway 渠道：/models 每个模型带 kind 与 capabilities，面板和请求按它渲染，不再按模型名猜。
export const AIMG_PROTOCOL = "aimg";

export type GatewayVideoCaps = {
    modes?: string[];
    durations?: string[];
    duration_default?: string;
    duration_min?: number;
    duration_max?: number;
    ratios?: string[];
    ratio_default?: string;
    resolutions?: string[];
    resolution_default?: string;
    supports_first_frame?: boolean;
    supports_last_frame?: boolean;
    requires_images?: boolean;
    max_references?: number;
    max_reference_videos?: number;
    max_reference_audios?: number;
    supports_audio?: boolean;
    supports_negative_prompt?: boolean;
    value_labels?: GatewayValueLabels;
};

export type GatewayImageCaps = {
    sizes?: string[];
    size_mode?: string;
    max_n?: number;
    qualities?: string[];
    resolutions?: string[];
    backgrounds?: string[];
    formats?: string[];
    supports_edit?: boolean;
    requires_images?: boolean;
    supports_mask?: boolean;
    max_edit_images?: number;
    first_image_is_source?: boolean;
    defaults?: Record<string, string>;
    value_labels?: GatewayValueLabels;
};

// 网关在 capabilities.value_labels 里给出枚举值的中文显示名（按 size/quality/background/ratio/resolution 等分组），
// 只覆盖显示，请求仍发原值；没给中文名的值原样显示。
export type GatewayValueLabels = Record<string, Record<string, string>>;

export function gatewayValueLabel(caps: { value_labels?: GatewayValueLabels } | null | undefined, kind: string) {
    const labels = caps?.value_labels?.[kind] || {};
    return (value: string) => labels[value] || value;
}

export type GatewaySpeechCaps = {
    voice_mode?: "preset" | "library" | "sample" | "prompt" | "none";
    voice_presets?: string[];
    default_preset?: string;
    formats?: string[];
    language?: { supported?: boolean; preset?: string; inline?: string[]; note?: string };
    speed?: { mode?: "field" | "prompt" | "none"; min?: number; max?: number };
    instructions_uses?: string;
    voice_required?: boolean;
};

export type GatewayModelSpec = { kind: "image" | "video" | "speech"; capabilities?: Record<string, unknown> };
export type GatewayModelSpecs = Record<string, GatewayModelSpec>;

export function parseGatewayModels(payload: unknown): GatewayModelSpecs {
    const data = (payload as { data?: Array<{ id?: string; kind?: string; capabilities?: Record<string, unknown> }> })?.data || [];
    const specs: GatewayModelSpecs = {};
    for (const item of data) {
        const id = item.id?.trim();
        if (!id || (item.kind !== "image" && item.kind !== "video" && item.kind !== "speech")) continue;
        specs[id] = { kind: item.kind, capabilities: item.capabilities || {} };
    }
    return specs;
}

export function capabilityForGatewayKind(kind: GatewayModelSpec["kind"]): ModelCapability {
    return kind === "speech" ? "audio" : kind;
}

export function pickGatewayModelSpecs(specs: GatewayModelSpecs, models: string[]) {
    return Object.fromEntries(models.flatMap((model) => specs[model] ? [[model, specs[model]]] : [])) as GatewayModelSpecs;
}

export function gatewayModelCapabilities(specs: GatewayModelSpecs): ModelCapabilities {
    return Object.fromEntries(Object.entries(specs).map(([model, spec]) => [model, capabilityForGatewayKind(spec.kind)]));
}

export function gatewaySpecForConfig(config: AiConfig, model = config.model): GatewayModelSpec | null {
    if (!model) return null;
    const active = { ...config, model };
    const channel = config.channelMode === "remote"
        ? (() => {
            const channels = config.publicChannels.filter((item) => item.models?.includes(model));
            return channels.find((item) => item.id === channelIdForActiveModel(active)) || channels[0];
        })()
        : localChannelForActiveModel(active);
    if (channel?.protocol !== AIMG_PROTOCOL) return null;
    return channel.modelSpecs?.[model] || null;
}

export function gatewayVideoCaps(config: AiConfig, model?: string) {
    const spec = gatewaySpecForConfig(config, model);
    return spec?.kind === "video" ? (spec.capabilities || {}) as GatewayVideoCaps : null;
}

export function gatewayImageCaps(config: AiConfig, model?: string) {
    const spec = gatewaySpecForConfig(config, model);
    return spec?.kind === "image" ? (spec.capabilities || {}) as GatewayImageCaps : null;
}

export function gatewaySpeechCaps(config: AiConfig, model?: string) {
    const spec = gatewaySpecForConfig(config, model);
    return spec?.kind === "speech" ? (spec.capabilities || {}) as GatewaySpeechCaps : null;
}

// 当前值在能力列表里就用它，否则用默认值，再否则用列表第一项；列表为空返回 ""（表示该项不发送）。
export function pickGatewayOption(value: string | undefined, options: string[] | undefined, fallback?: string) {
    if (!options?.length) return "";
    if (value && options.includes(value)) return value;
    if (fallback && options.includes(fallback)) return fallback;
    return options[0];
}

// 语音的 voice 值：音色库 id（vc_*）原样用；预设模式下不在预设列表里的值（如画布默认的 alloy）换成网关默认预设。
export function gatewaySpeechVoice(caps: GatewaySpeechCaps, value: string | undefined) {
    const mode = caps.voice_mode || "preset";
    const voice = (value || "").trim();
    if (mode === "none") return "";
    if (mode === "prompt") return voice;
    if (voice && (caps.voice_presets?.includes(voice) || ((mode === "library" || mode === "sample") && voice.startsWith("vc_")))) return voice;
    return caps.default_preset || caps.voice_presets?.[0] || "";
}

export function gatewayVideoDurations(caps: GatewayVideoCaps) {
    if (caps.durations?.length) return caps.durations;
    if (caps.duration_min && caps.duration_max && caps.duration_max >= caps.duration_min) {
        return Array.from({ length: caps.duration_max - caps.duration_min + 1 }, (_, index) => String(caps.duration_min! + index));
    }
    return [];
}

export function gatewayVideoModes(caps: GatewayVideoCaps) {
    return (caps.modes || []).filter((mode) => mode === "frames" || mode === "reference");
}

export function gatewayVideoMode(caps: GatewayVideoCaps, value: string | undefined) {
    return pickGatewayOption(value, gatewayVideoModes(caps));
}

export function gatewaySupportsFrames(caps: GatewayVideoCaps, mode: string) {
    return Boolean(caps.supports_first_frame || caps.supports_last_frame) && mode !== "reference";
}

// 首尾帧入口是否可用：网关模型按能力参数和当前模式判断；非网关模型返回 null，调用方走原有规则。
export function gatewayFrameReferences(config: AiConfig, model?: string) {
    const caps = gatewayVideoCaps(config, model);
    return caps ? gatewaySupportsFrames(caps, gatewayVideoMode(caps, config.videoMode)) : null;
}

// 音频生成开关是否可用：非网关模型返回 null。
export function gatewayVideoAudio(config: AiConfig, model?: string) {
    const caps = gatewayVideoCaps(config, model);
    return caps ? Boolean(caps.supports_audio) : null;
}
