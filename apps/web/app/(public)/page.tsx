import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InfoCard } from "@/components/ui/InfoCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StatItem } from "@/components/ui/StatItem";

const steps = [
  {
    number: "01",
    title: "Сдай экзамены и загрузи аттестат",
    description:
      "Получить результаты ЦТ и загрузить аттестат в личном кабинете",
  },
  {
    number: "02",
    title: "Просмотреть шансы на поступление",
    description:
      "Система сама подсчитает твои шансы через метод Монте-Карло: зеленый, желтый и красный",
  },
  {
    number: "03",
    title: "Избранные специальности",
    description:
      "Добавь в избранные специальности, куда ты желаешь поступить и следи за конкурсом",
  },
];

const features = [
  {
    number: "01",
    title: "Запись на ЦТ",
    description:
      "Выбор места сдачи, отслеживание свободных мест и скачивание пропуска",
  },
  {
    number: "02",
    title: "Просмотр ошибок",
    description:
      "Просмотр и разбор ошибок, которые появились на тестировании",
  },
  {
    number: "03",
    title: "Шансы поступления",
    description:
      "Расчет вероятности происходит исходя из конкурсов прошлых лет",
  },
  {
    number: "04",
    title: "Анонимный рейтинг",
    description:
      "Сравнение своих баллов с другими выпускниками по всей стране",
  },
];

const stats = [
  { value: "42", label: "Вузов в каталоге" },
  { value: "460+", label: "Специальностей" },
  { value: "200+", label: "Пользователей" },
  { value: "400", label: "Макс. шкала баллов" },
];

const faqs = [
  {
    question: "Как рассчитывается конкурсный балл?",
    answer:
      "По формуле Минобразования: сумма трёх сертификатов ЦТ (до 100 каждый) плюс средний балл аттестата × 10. Итого максимум 400 баллов.",
  },
  {
    question: "Можно ли подать документы через сервис?",
    answer:
      "Нет. Документы в вузы подаются лично. Ориентир помогает оценить шансы, подготовиться и записаться на ЦТ.",
  },
  {
    question: "Что значит жёлтый статус «Близко»?",
    answer:
      "Ваш балл в коридоре ±5 от прошлогоднего проходного. В этой зоне конкурс может качнуться в любую сторону.",
  },
  {
    question: "Откуда берутся пробники?",
    answer:
      "Варианты составлены по спецификациям РИКЗ прошлых лет и повторяют структуру частей А и В.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="py-12 md:py-20">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-6">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-900 md:text-5xl">
                Узнай куда ты проходишь –{" "}
                <span className="text-brand-700">за минуту</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-text-secondary">
                Единый информационный сервис для абитуриентов Беларуси: укажи
                свои баллы ЦТ и аттестата, оцени реальные шансы на бюджет и
                готовься по проверенным пробникам.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button href="/register" className="px-6 py-3">
                  Начать бесплатно
                </Button>
                <Button href="/login" variant="secondary" className="px-6 py-3">
                  Войти в аккаунт
                </Button>
              </div>
            </div>

            <div className="flex justify-center lg:col-span-6 lg:justify-end">
              <Image
                src="/hero-student.png"
                alt="Студент готовится к поступлению"
                width={520}
                height={420}
                className="h-auto w-full max-w-[520px]"
                priority
              />
            </div>
          </div>
        </Container>
      </section>

      <section
        id="how"
        className="scroll-mt-20 border-y border-border bg-white py-14"
      >
        <Container>
          <SectionTitle
            title="Как это работает"
            subtitle="Три простых шага для оценки шансов поступления"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <InfoCard
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </Container>
      </section>

      <section id="features" className="scroll-mt-20 py-14">
        <Container>
          <SectionTitle
            title="Возможности сервиса"
            subtitle="Все необходимые инструменты для выпускников 11 классов"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <InfoCard
                key={feature.number}
                variant="white"
                number={feature.number}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-white py-10">
        <Container>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </div>
        </Container>
      </section>

      <section id="faq" className="scroll-mt-20 py-14">
        <Container className="max-w-3xl">
          <SectionTitle title="Частые вопросы" />

          <div className="space-y-3">
            {faqs.map((item) => (
              <div
                key={item.question}
                className="rounded-[10px] border border-border bg-white p-4"
              >
                <h3 className="text-sm font-bold text-brand-900">
                  {item.question}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-14">
        <Container>
          <div className="space-y-4 rounded-[16px] bg-brand-900 px-8 py-10 text-center text-white md:px-12 md:py-12">
            <h2 className="text-2xl font-extrabold md:text-3xl">
              Готов оценить свои шансы?
            </h2>
            <p className="mx-auto max-w-lg text-sm text-slate-300">
              Подай заявку на тестирование и дождись результатов
            </p>
            <div className="pt-2">
              <Button href="/login" className="px-8 py-3">
                Перейти в личный кабинет
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
