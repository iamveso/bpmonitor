import { createMemo, createSignal, For, Show } from 'solid-js'

import { cn } from '../lib/utils'

export interface TrendPoint {
  label: string
  systolic: number
  diastolic: number
  heartRate: number | null
}

const W = 820
const H = 320
const PAD = { top: 20, right: 20, bottom: 42, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const COLORS = {
  systolic: 'var(--color-chart-1)',
  diastolic: 'var(--color-chart-2)',
  heartRate: 'var(--color-chart-4)',
}

export function TrendChart(props: {
  points: TrendPoint[]
  showHeartRate?: boolean
  class?: string
}) {
  const [hovered, setHovered] = createSignal<{
    index: number
    point: TrendPoint
  } | null>(null)
  let svg: SVGSVGElement | undefined

  const hasHeartRate = createMemo(() =>
    props.showHeartRate
      ? props.points.some((point) => point.heartRate != null)
      : false,
  )

  const bounds = createMemo(() => {
    const values: number[] = []
    for (const point of props.points) {
      values.push(point.systolic, point.diastolic)
      if (hasHeartRate() && point.heartRate != null) {
        values.push(point.heartRate)
      }
    }
    if (values.length === 0) return { min: 40, max: 160 }

    let min = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10)
    let max = Math.ceil((Math.max(...values) + 10) / 10) * 10
    if (max - min < 40) {
      const mid = (min + max) / 2
      min = Math.max(0, Math.floor((mid - 20) / 10) * 10)
      max = min + 40
    }
    return { min, max }
  })

  const xFor = (index: number) =>
    props.points.length <= 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (index / (props.points.length - 1)) * PLOT_W

  const yFor = (value: number) =>
    PAD.top +
    PLOT_H -
    ((value - bounds().min) / (bounds().max - bounds().min)) * PLOT_H

  const ticks = createMemo(() => {
    const { min, max } = bounds()
    const count = 4
    return Array.from(
      { length: count + 1 },
      (_, index) => min + (index * (max - min)) / count,
    )
  })

  const pathFor = (get: (point: TrendPoint) => number | null) => {
    const segments: string[] = []
    props.points.forEach((point, index) => {
      const value = get(point)
      if (value == null) return
      const command = segments.length === 0 ? 'M' : 'L'
      segments.push(
        `${command}${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)}`,
      )
    })
    return segments.join(' ')
  }

  const areaFor = (get: (point: TrendPoint) => number) => {
    if (props.points.length === 0) return ''
    const line = props.points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'}${xFor(index).toFixed(1)} ${yFor(get(point)).toFixed(1)}`,
      )
      .join(' ')
    const baseline = PAD.top + PLOT_H
    const lastX = xFor(props.points.length - 1).toFixed(1)
    const firstX = xFor(0).toFixed(1)
    return `${line} L${lastX} ${baseline} L${firstX} ${baseline} Z`
  }

  const labelStep = createMemo(() =>
    Math.max(1, Math.ceil(props.points.length / 8)),
  )

  const handleMove = (event: PointerEvent) => {
    if (!svg || props.points.length === 0) return
    const rect = svg.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * W

    let nearest = 0
    let best = Number.POSITIVE_INFINITY
    props.points.forEach((_, index) => {
      const distance = Math.abs(xFor(index) - x)
      if (distance < best) {
        best = distance
        nearest = index
      }
    })

    setHovered({ index: nearest, point: props.points[nearest] })
  }

  return (
    <div class={cn('w-full', props.class)}>
      <div class="relative w-full">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          class="h-auto w-full touch-none"
          role="img"
          aria-label="Blood pressure trend over the selected period"
          onPointerMove={handleMove}
          onPointerLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient
              id="trend-systolic-fill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stop-color={COLORS.systolic}
                stop-opacity="0.26"
              />
              <stop
                offset="100%"
                stop-color={COLORS.systolic}
                stop-opacity="0"
              />
            </linearGradient>
          </defs>

          <For each={ticks()}>
            {(tick) => (
              <g>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={yFor(tick)}
                  y2={yFor(tick)}
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-dasharray="4 6"
                  class="text-border"
                />
                <text
                  x={PAD.left - 10}
                  y={yFor(tick) + 4}
                  text-anchor="end"
                  class="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {Math.round(tick)}
                </text>
              </g>
            )}
          </For>

          <Show when={props.points.length > 0}>
            <path
              d={areaFor((point) => point.systolic)}
              fill="url(#trend-systolic-fill)"
            />
            <path
              d={pathFor((point) => point.systolic)}
              fill="none"
              stroke={COLORS.systolic}
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d={pathFor((point) => point.diastolic)}
              fill="none"
              stroke={COLORS.diastolic}
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <Show when={hasHeartRate()}>
              <path
                d={pathFor((point) => point.heartRate)}
                fill="none"
                stroke={COLORS.heartRate}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-dasharray="3 5"
              />
            </Show>

            <For each={props.points}>
              {(point, index) => (
                <Show
                  when={
                    index() % labelStep() === 0 ||
                    index() === props.points.length - 1
                  }
                >
                  <text
                    x={xFor(index())}
                    y={H - PAD.bottom + 22}
                    text-anchor="middle"
                    class="fill-muted-foreground text-[11px]"
                  >
                    {point.label}
                  </text>
                </Show>
              )}
            </For>

            <Show when={hovered()}>
              {(hover) => (
                <line
                  x1={xFor(hover().index)}
                  x2={xFor(hover().index)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                  stroke="currentColor"
                  stroke-width="1"
                  class="text-muted-foreground/40"
                />
              )}
            </Show>

            <For each={props.points}>
              {(point, index) => (
                <Show
                  when={
                    props.points.length <= 40 || hovered()?.index === index()
                  }
                >
                  <circle
                    cx={xFor(index())}
                    cy={yFor(point.systolic)}
                    r="3"
                    fill={COLORS.systolic}
                    stroke="var(--color-card)"
                    stroke-width="1.5"
                  />
                  <circle
                    cx={xFor(index())}
                    cy={yFor(point.diastolic)}
                    r="3"
                    fill={COLORS.diastolic}
                    stroke="var(--color-card)"
                    stroke-width="1.5"
                  />
                </Show>
              )}
            </For>
          </Show>
        </svg>

        <Show when={hovered()}>
          {(hover) => (
            <div
              class="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 text-xs shadow-card backdrop-blur"
              style={{ left: `${(xFor(hover().index) / W) * 100}%` }}
            >
              <div class="font-medium">{hover().point.label}</div>
              <div class="mt-0.5 flex items-center gap-2 tabular-nums">
                <span class="flex items-center gap-1">
                  <span
                    class="h-2 w-2 rounded-full"
                    style={{ 'background-color': COLORS.systolic }}
                  />
                  {hover().point.systolic}
                </span>
                <span class="flex items-center gap-1">
                  <span
                    class="h-2 w-2 rounded-full"
                    style={{ 'background-color': COLORS.diastolic }}
                  />
                  {hover().point.diastolic}
                </span>
                <Show when={hover().point.heartRate != null}>
                  <span class="flex items-center gap-1">
                    <span
                      class="h-2 w-2 rounded-full"
                      style={{ 'background-color': COLORS.heartRate }}
                    />
                    {hover().point.heartRate}
                  </span>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <LegendItem color={COLORS.systolic} label="Systolic" />
        <LegendItem color={COLORS.diastolic} label="Diastolic" />
        <Show when={hasHeartRate()}>
          <LegendItem color={COLORS.heartRate} label="Heart rate" />
        </Show>
      </div>
    </div>
  )
}

function LegendItem(props: { color: string; label: string }) {
  return (
    <span class="flex items-center gap-1.5">
      <span
        class="h-2.5 w-2.5 rounded-full"
        style={{ 'background-color': props.color }}
      />
      {props.label}
    </span>
  )
}
