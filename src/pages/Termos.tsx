import { MarketingLayout } from "@/components/MarketingLayout";

export default function Termos() {
  return (
    <MarketingLayout>
      <section className="container px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-4xl">Termos de Uso</h1>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          <p>
            Estes Termos de Uso regem o acesso e a utilização do SISFEC. Ao criar uma conta ou utilizar a plataforma, você concorda com as condições
            abaixo.
          </p>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">1. Conta e acesso</h2>
            <p>
              Você é responsável por manter suas credenciais em sigilo e por toda atividade realizada na conta. Podemos suspender ou encerrar acessos em caso
              de uso indevido, violação destes termos ou exigência legal.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">2. Planos e cobrança</h2>
            <p>
              Os planos, valores e regras de assinatura são definidos no painel administrativo e podem ser atualizados ao longo do tempo. Pagamentos e
              assinaturas serão processados via Mercado Pago, conforme as condições apresentadas no momento do checkout.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">3. Uso aceitável</h2>
            <p>
              É proibido explorar vulnerabilidades, interferir no serviço, realizar engenharia reversa não autorizada, enviar conteúdo ilegal ou utilizar a
              plataforma para fins que violem leis aplicáveis.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">4. Privacidade</h2>
            <p>
              O tratamento de dados pessoais segue a Política de Privacidade. Ao utilizar o SISFEC, você declara estar ciente e de acordo com ela.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">5. Alterações</h2>
            <p>
              Podemos atualizar estes Termos de Uso para refletir mudanças no serviço, requisitos legais ou melhorias. A versão vigente estará disponível nesta
              página.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

