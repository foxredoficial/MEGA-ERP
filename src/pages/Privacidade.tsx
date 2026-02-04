import { MarketingLayout } from "@/components/MarketingLayout";

export default function Privacidade() {
  return (
    <MarketingLayout>
      <section className="container px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-4xl">Política de Privacidade</h1>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
          <p>
            Esta Política descreve como o MEGA ERP coleta, utiliza e protege dados pessoais necessários para fornecer o serviço, incluindo criação de conta,
            autenticação e gestão de assinatura.
          </p>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">1. Dados coletados</h2>
            <p>
              Podemos coletar dados de cadastro (como email, nome e empresa), dados de acesso (como logs de autenticação e endereço IP) e dados relacionados à
              assinatura (como identificadores de pagamento e status), conforme necessário para operar a plataforma.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">2. Pagamentos</h2>
            <p>
              O processamento de pagamentos e assinaturas ocorre via Mercado Pago. Dados de pagamento podem ser tratados pelo provedor de pagamento conforme as
              políticas e termos do Mercado Pago.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">3. Compartilhamento</h2>
            <p>
              Compartilhamos dados somente quando necessário para execução do serviço (por exemplo, provedores de infraestrutura e pagamento) ou por obrigação
              legal.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">4. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteção dos dados, incluindo controles de acesso e boas práticas de armazenamento e transporte
              de informações.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">5. Direitos do titular</h2>
            <p>
              Você pode solicitar acesso, correção ou exclusão de dados, quando aplicável, conforme a legislação vigente. Solicitações podem ser tratadas por
              canais de suporte definidos pela empresa responsável pela plataforma.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

