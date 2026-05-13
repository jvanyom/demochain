import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { FilePlus2, CheckCircle2, ListOrdered } from 'lucide-react';

const icons = [FilePlus2, CheckCircle2, ListOrdered];

export function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('landing.how.steps', { returnObjects: true }) as { title: string; text: string }[];

  return (
    <section id="how" className="relative border-y border-border/60 bg-surface/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl"
        >
          {t('landing.how.title')}
        </m.h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <m.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-elevated p-8"
              >
                <div className="absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/20" />
                <div className="relative">
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-fg">
                    <Icon size={22} />
                  </div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mb-2 font-display text-xl font-semibold text-fg">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </m.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
