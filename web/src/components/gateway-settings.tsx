"use client";

import { Input, Select, Slider, Switch } from "antd";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { ImageSettingsTheme } from "@/components/image-settings-panel";
import { gatewaySpeechVoice, gatewayValueLabel, gatewayVideoDurations, gatewayVideoMode, gatewayVideoModes, pickGatewayOption, type GatewayImageCaps, type GatewaySpeechCaps, type GatewayVideoCaps } from "@/lib/ai-media-gateway";
import { type CanvasTheme } from "@/lib/canvas-theme";
import { fetchGatewayVoices, type GatewayVoice } from "@/services/api/audio";
import { type AiConfig } from "@/stores/use-config-store";

// AI Media Gateway 模型的设置面板：只渲染能力参数里声明的项，选项和默认值也都来自能力参数。

const videoModeLabels: Record<string, string> = { frames: "首尾帧", reference: "参考图" };

type VideoKey = "vquality" | "size" | "videoSeconds" | "videoMode" | "videoNegativePrompt" | "videoGenerateAudio";

export function GatewayVideoSettings({ caps, config, onConfigChange, theme, showTitle, className, hideNegativePrompt, visualOnly }: { caps: GatewayVideoCaps; config: AiConfig; onConfigChange: (key: VideoKey, value: string) => void; theme: CanvasTheme; showTitle?: boolean; className?: string; hideNegativePrompt?: boolean; visualOnly?: boolean }) {
    const modes = gatewayVideoModes(caps);
    const mode = gatewayVideoMode(caps, config.videoMode);
    const resolution = pickGatewayOption(config.vquality, caps.resolutions, caps.resolution_default);
    const ratio = pickGatewayOption(config.size, caps.ratios, caps.ratio_default);
    const durations = gatewayVideoDurations(caps);
    const seconds = pickGatewayOption(config.videoSeconds, durations, caps.duration_default);
    useCorrectStoredValues<VideoKey>([
        ...(!visualOnly ? [["videoMode", config.videoMode, mode] as const, ["videoSeconds", config.videoSeconds, seconds] as const] : []),
        ["vquality", config.vquality, resolution],
        ["size", config.size, ratio],
    ], onConfigChange);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-lg font-semibold">视频设置</div> : null}
                {!visualOnly && modes.length > 1 ? <PillGroup title="生成模式" theme={theme} value={mode} options={modes} label={(item) => videoModeLabels[item] || item} onChange={(value) => onConfigChange("videoMode", value)} /> : null}
                {caps.resolutions?.length ? <PillGroup title="清晰度" theme={theme} value={resolution} options={caps.resolutions} label={gatewayValueLabel(caps, "resolution")} onChange={(value) => onConfigChange("vquality", value)} /> : null}
                {caps.ratios?.length ? <PillGroup title="比例" theme={theme} value={ratio} options={caps.ratios} label={gatewayValueLabel(caps, "ratio")} onChange={(value) => onConfigChange("size", value)} /> : null}
                {!visualOnly && durations.length ? (
                    durations.length > 8
                        ? (
                            <SettingGroup title={`时长 · ${seconds} 秒`} color={theme.node.muted}>
                                <Slider min={Number(durations[0])} max={Number(durations[durations.length - 1])} step={1} value={Number(seconds)} onChange={(value) => onConfigChange("videoSeconds", String(value))} />
                            </SettingGroup>
                        )
                        : <PillGroup title="时长" theme={theme} value={seconds} options={durations} label={(item) => `${item} 秒`} onChange={(value) => onConfigChange("videoSeconds", value)} />
                ) : null}
                {!visualOnly && !hideNegativePrompt && caps.supports_negative_prompt ? (
                    <SettingGroup title="负面提示词" color={theme.node.muted}>
                        <TextArea value={config.videoNegativePrompt || ""} placeholder="描述不希望出现在视频中的内容" theme={theme} onChange={(value) => onConfigChange("videoNegativePrompt", value)} />
                    </SettingGroup>
                ) : null}
                {!visualOnly && caps.supports_audio ? (
                    <SettingGroup title="音频生成" color={theme.node.muted}>
                        <div className="flex items-center justify-between gap-3 rounded-xl border p-2.5 text-sm" style={{ borderColor: theme.node.stroke }}>
                            <span>是否生成与视频同步的AI音频</span>
                            <Switch size="small" checked={config.videoGenerateAudio === "true"} onChange={(checked) => onConfigChange("videoGenerateAudio", String(checked))} />
                        </div>
                    </SettingGroup>
                ) : null}
            </div>
        </ImageSettingsTheme>
    );
}

type ImageKey = "quality" | "size" | "count" | "imageBackground";

export function GatewayImageSettings({ caps, config, onConfigChange, theme, showTitle, showSize = true, showCount = true, className, maxCount = 15 }: { caps: GatewayImageCaps; config: AiConfig; onConfigChange: (key: ImageKey, value: string) => void; theme: CanvasTheme; showTitle?: boolean; showSize?: boolean; showCount?: boolean; className?: string; maxCount?: number }) {
    const defaults = caps.defaults || {};
    const countLimit = Math.min(maxCount, 10, Math.max(1, caps.max_n || 1));
    const count = String(Math.max(1, Math.min(countLimit, Math.floor(Number(config.count) || 1))));
    const quality = pickGatewayOption(config.quality, caps.qualities, defaults.quality);
    const size = pickGatewayOption(config.size, caps.sizes, defaults.size);
    const background = pickGatewayOption(config.imageBackground, caps.backgrounds, defaults.background);
    useCorrectStoredValues<ImageKey>([
        ["quality", config.quality, quality],
        ["imageBackground", config.imageBackground, background],
        ...(showSize ? [["size", config.size, size] as const] : []),
        ...(showCount ? [["count", config.count === undefined ? undefined : String(config.count), count] as const] : []),
    ], onConfigChange);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-lg font-semibold">图像设置</div> : null}
                {caps.qualities?.length ? <PillGroup title="质量" theme={theme} value={quality} options={caps.qualities} label={gatewayValueLabel(caps, "quality")} onChange={(value) => onConfigChange("quality", value)} /> : null}
                {showSize && caps.sizes?.length ? <PillGroup title={caps.size_mode === "aspect_ratio" ? "比例" : "尺寸"} theme={theme} value={size} options={caps.sizes} label={gatewayValueLabel(caps, "size")} onChange={(value) => onConfigChange("size", value)} /> : null}
                {showCount && countLimit > 1 ? <PillGroup title="数量" theme={theme} value={count} options={Array.from({ length: countLimit }, (_, index) => String(index + 1))} onChange={(value) => onConfigChange("count", value)} /> : null}
                {caps.backgrounds?.length ? <PillGroup title="背景" theme={theme} value={background} options={caps.backgrounds} label={gatewayValueLabel(caps, "background")} onChange={(value) => onConfigChange("imageBackground", value)} /> : null}
            </div>
        </ImageSettingsTheme>
    );
}

type AudioKey = "audioVoice" | "audioFormat" | "audioSpeed" | "audioInstructions" | "audioLanguage";

export function GatewayAudioSettings({ caps, config, model, onConfigChange, theme }: { caps: GatewaySpeechCaps; config: AiConfig; model: string; onConfigChange: (key: AudioKey, value: string) => void; theme: CanvasTheme }) {
    const { voices, languages } = useGatewayVoices(config, model, caps);
    const voiceMode = caps.voice_mode || "preset";
    const voiceOptions = [
        ...(caps.voice_presets || []).map((value) => ({ value, label: value })),
        ...(voiceMode === "library" || voiceMode === "sample" ? voices.map((voice) => ({ value: voice.id, label: `${voice.name}（音色库）` })) : []),
    ];
    // 显示实际会发送的值（与 buildGatewaySpeechRequest 同一规则）；为空表示请求不带 voice，显示「默认音色」占位。
    const voice = gatewaySpeechVoice(caps, config.audioVoice) || undefined;
    const canClearVoice = !(caps.default_preset || caps.voice_presets?.length);
    const speedMin = caps.speed?.min || 0.5;
    const speedMax = caps.speed?.max || 2;
    const speed = Math.min(speedMax, Math.max(speedMin, Number(config.audioSpeed) || 1));
    const format = pickGatewayOption(config.audioFormat, caps.formats);
    const speedEnabled = Boolean(caps.speed?.mode && caps.speed.mode !== "none");
    useCorrectStoredValues<AudioKey>([
        ...(voiceMode === "preset" || voiceMode === "library" || voiceMode === "sample" ? [["audioVoice", config.audioVoice, voice || ""] as const] : []),
        ["audioFormat", config.audioFormat, format],
        ...(speedEnabled && config.audioSpeed ? [["audioSpeed", config.audioSpeed, String(speed)] as const] : []),
    ], onConfigChange);

    return (
        <>
            {voiceMode === "prompt" ? (
                <SettingGroup title="音色描述" color={theme.node.muted}>
                    <TextArea value={config.audioVoice || ""} placeholder="描述想要的音色，例如：温柔的年轻女声" theme={theme} onChange={(value) => onConfigChange("audioVoice", value)} />
                </SettingGroup>
            ) : voiceMode !== "none" && voiceOptions.length ? (
                <SettingGroup title="声音" color={theme.node.muted}>
                    <Select className="w-full" showSearch optionFilterProp="label" value={voice} placeholder="默认音色" allowClear={canClearVoice} options={voiceOptions} styles={popupStyles} getPopupContainer={popupContainer} onChange={(value) => onConfigChange("audioVoice", value || "")} />
                </SettingGroup>
            ) : null}
            {caps.language?.supported ? (
                <SettingGroup title="语言" color={theme.node.muted}>
                    <Select className="w-full" showSearch styles={popupStyles} getPopupContainer={popupContainer} value={config.audioLanguage || ""} options={[{ value: "", label: "自动" }, ...languages.map((value) => ({ value, label: value }))]} onChange={(value) => onConfigChange("audioLanguage", value)} />
                </SettingGroup>
            ) : null}
            {caps.formats?.length ? <PillGroup title="格式" theme={theme} value={format} options={caps.formats} onChange={(value) => onConfigChange("audioFormat", value)} /> : null}
            {caps.speed?.mode && caps.speed.mode !== "none" ? (
                <SettingGroup title={`语速 · ${speed}x`} color={theme.node.muted}>
                    <Slider min={speedMin} max={speedMax} step={0.05} value={speed} onChange={(value) => onConfigChange("audioSpeed", String(value))} />
                </SettingGroup>
            ) : null}
            {caps.instructions_uses ? (
                <SettingGroup title="声音指令" color={theme.node.muted}>
                    <TextArea value={config.audioInstructions || ""} placeholder="例如：语气轻快，带一点笑意" theme={theme} onChange={(value) => onConfigChange("audioInstructions", value)} />
                </SettingGroup>
            ) : null}
        </>
    );
}

// 存的值不在当前模型的能力列表里时（切换模型、旧画布节点、历史参数带来的旧值），把它改成面板高亮、请求实际发送的那个值，
// 让配置里存的和实际用的一致。只纠正模型有选项的项（实际值非空）；模型没有的项保持原值，因为它不会被发送，清掉反而影响其他模型。
function useCorrectStoredValues<K extends string>(entries: ReadonlyArray<readonly [K, string | undefined, string]>, onChange: (key: K, value: string) => void) {
    const pending = entries.filter(([, stored, actual]) => actual !== "" && (stored ?? "") !== actual);
    const signature = JSON.stringify(pending);
    useEffect(() => {
        pending.forEach(([key, , actual]) => onChange(key, actual));
        // 只在待纠正的值变化时执行；onChange 每次渲染都是新函数。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);
}

// 下拉框弹层要高于设置面板（zIndex 1200），并挂在面板内，写法与 MiniMax 音色下拉一致。
const popupStyles = { popup: { root: { zIndex: 1300 } } };
const popupContainer = (trigger: HTMLElement) => trigger.closest<HTMLElement>(".canvas-image-settings-popover") || document.body;

// caps 传 null 时不拉取。
export function useGatewayVoices(config: AiConfig, model: string, caps: GatewaySpeechCaps | null) {
    const [result, setResult] = useState<{ key: string; voices: GatewayVoice[]; languages: string[] }>({ key: "", voices: [], languages: [] });
    const needed = Boolean(caps) && (caps?.voice_mode === "library" || caps?.voice_mode === "sample" || Boolean(caps?.language?.supported));
    const key = needed ? `${config.channelMode}|${model}` : "";
    useEffect(() => {
        if (!key) return;
        let canceled = false;
        void fetchGatewayVoices({ ...config, model }, model)
            .then((data) => { if (!canceled) setResult({ key, ...data }); })
            .catch(() => { if (!canceled) setResult({ key, voices: [], languages: [] }); });
        return () => { canceled = true; };
        // config 每次渲染都是新对象，只在渠道模式或模型变化时重新拉取。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return result.key === key ? result : { voices: [], languages: [] };
}

function PillGroup({ title, theme, value, options, label = (item) => item, onChange }: { title: string; theme: CanvasTheme; value: string; options: string[]; label?: (item: string) => string; onChange: (value: string) => void }) {
    return (
        <SettingGroup title={title} color={theme.node.muted}>
            <div className="grid grid-cols-3 gap-2.5">
                {options.map((item) => (
                    <button key={item} type="button" className="h-9 cursor-pointer rounded-full border px-2 text-sm transition hover:opacity-80" style={{ background: "transparent", borderColor: value === item ? theme.node.text : theme.node.stroke, color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()} onClick={() => onChange(item)}>
                        {label(item)}
                    </button>
                ))}
            </div>
        </SettingGroup>
    );
}

function SettingGroup({ title, color, children }: { title: string; color: string; children: ReactNode }) {
    return (
        <div className="space-y-2.5">
            <div className="text-xs font-medium" style={{ color }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function TextArea({ value, placeholder, theme, onChange }: { value: string; placeholder: string; theme: CanvasTheme; onChange: (value: string) => void }) {
    return (
        <Input.TextArea
            value={value}
            placeholder={placeholder}
            autoSize={{ minRows: 3, maxRows: 6 }}
            className="rounded-xl placeholder:!text-[var(--canvas-placeholder)] placeholder:!opacity-55"
            style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text, WebkitTextFillColor: theme.node.text, "--canvas-placeholder": theme.node.placeholder } as CSSProperties}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => onChange(event.target.value)}
        />
    );
}
