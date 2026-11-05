export type PrintExportProgressStep = {
  weight: number
}

/** Progression pondérée 0–100 pour l’export multi-étapes. */
export class WeightedExportProgress {
  private completedWeight = 0
  private currentStepWeight = 0
  private currentLabel = ''
  private currentRatio = 0

  constructor(
    private readonly steps: PrintExportProgressStep[],
    private readonly onUpdate: (percent: number, detail: string) => void,
  ) {}

  private totalWeight(): number {
    return this.steps.reduce((sum, step) => sum + step.weight, 0) || 1
  }

  startStep(index: number, label: string): void {
    this.currentStepWeight = this.steps[index]?.weight ?? 0
    this.currentLabel = label
    this.currentRatio = 0
    this.tick(0)
  }

  setDetail(label: string): void {
    this.currentLabel = label
    this.tick(this.currentRatio)
  }

  tick(ratioInStep: number): void {
    const clamped = Math.min(1, Math.max(0, ratioInStep))
    this.currentRatio = clamped
    const inStep = this.currentStepWeight * clamped
    const percent = ((this.completedWeight + inStep) / this.totalWeight()) * 100
    this.onUpdate(Math.round(percent), this.currentLabel)
  }

  endStep(): void {
    this.completedWeight += this.currentStepWeight
    this.currentRatio = 1
    const percent = (this.completedWeight / this.totalWeight()) * 100
    this.onUpdate(Math.round(Math.min(100, percent)), this.currentLabel)
  }
}
