/**
 * Préchauffage différé et interruptible : la tâche ne démarre qu’après `idleMs` sans nouvelle
 * demande, et `interrupt()` l’annule ou interrompt son rendu (interaction sur l’aperçu,
 * fermeture de la modale). Évite de bloquer le navigateur pendant que l’utilisateur déplace la carte.
 */
export class PrintPrewarmScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  private controller: AbortController | null = null

  constructor(private readonly idleMs: number) {}

  schedule(task: (signal: AbortSignal) => Promise<unknown>): void {
    this.interrupt()
    this.timer = setTimeout(() => {
      this.timer = null
      const controller = new AbortController()
      this.controller = controller
      void task(controller.signal)
        .catch(() => {
          /* interruption ou échec du préchauffage : l’export refera le rendu */
        })
        .finally(() => {
          if (this.controller === controller) this.controller = null
        })
    }, this.idleMs)
  }

  interrupt(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.controller?.abort()
    this.controller = null
  }
}
