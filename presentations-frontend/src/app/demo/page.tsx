"use client";

import { useState, useRef, useEffect } from "react";
import { Slide } from "@/types/presentation";
import { getTemplate, templateList } from "@/lib/templates";
import { SlideRenderer, SLIDE_WIDTH, SLIDE_HEIGHT } from "@/components/slides/SlideRenderer";
import { ChevronLeft, ChevronRight } from "lucide-react";

const demoSlides: Slide[] = [
  {
    id: "1",
    order: 0,
    layout: "title",
    content: {
      heading: "Стратегия цифровой трансформации",
      subheading: "Совкомбанк — план развития на 2026–2028 годы",
    },
  },
  {
    id: "2",
    order: 1,
    layout: "section",
    content: {
      heading: "Текущие результаты",
      subheading: "Ключевые достижения за прошедший период",
    },
  },
  {
    id: "3",
    order: 2,
    layout: "kpi",
    content: {
      heading: "Ключевые показатели 2025",
      kpiValues: [
        { value: "12.1M", label: "Активных клиентов", trend: "up" },
        { value: "₽2.8T", label: "Активы банка", trend: "up" },
        { value: "98.5%", label: "Uptime сервисов", trend: "neutral" },
        { value: "Top 10", label: "Рейтинг в РФ", trend: "up" },
      ],
    },
  },
  {
    id: "4",
    order: 3,
    layout: "content",
    content: {
      heading: "Стратегические приоритеты",
      bullets: [
        "Полный перевод обслуживания в цифровые каналы к 2027 году",
        "Внедрение AI-ассистента для персонализации продуктов",
        "Запуск открытого API для партнёрских интеграций",
        "Модернизация core-banking системы на микросервисную архитектуру",
      ],
    },
  },
  {
    id: "5",
    order: 4,
    layout: "two-columns",
    content: {
      heading: "Было → Стало",
      leftColumn: {
        heading: "До трансформации",
        bullets: [
          "Монолитная архитектура",
          "Среднее время обработки — 48 часов",
          "3 цифровых продукта",
          "Ручная обработка заявок",
        ],
      },
      rightColumn: {
        heading: "После трансформации",
        bullets: [
          "Микросервисы и облако",
          "Реалтайм обработка — 3 секунды",
          "25+ цифровых продуктов",
          "AI-автоматизация 85% процессов",
        ],
      },
    },
  },
  {
    id: "6",
    order: 5,
    layout: "image-text",
    content: {
      heading: "Мобильное приложение",
      bullets: [
        "4.8 рейтинг в App Store и Google Play",
        "Биометрическая аутентификация",
        "Персональные финансовые рекомендации",
      ],
      imageQuery: "mobile banking app modern interface",
    },
  },
  {
    id: "7",
    order: 6,
    layout: "timeline",
    content: {
      heading: "Дорожная карта",
      timelineItems: [
        { year: "Q1 2026", title: "AI-чатбот", description: "Запуск виртуального ассистента" },
        { year: "Q3 2026", title: "Open API", description: "Платформа для партнёров" },
        { year: "Q1 2027", title: "Cloud Native", description: "Миграция в облако" },
        { year: "Q4 2027", title: "Super App", description: "Единая экосистема сервисов" },
      ],
    },
  },
  {
    id: "8",
    order: 7,
    layout: "quote",
    content: {
      quoteText: "Цифровая трансформация — это не про технологии. Это про людей и их готовность меняться.",
      quoteAuthor: "Дмитрий Гусев",
      quoteRole: "Первый заместитель Председателя Правления",
    },
  },
  {
    id: "9",
    order: 8,
    layout: "full-image",
    content: {
      heading: "Будущее начинается сегодня",
      subheading: "Инвестиции в технологии — инвестиции в рост",
      imageQuery: "futuristic cityscape technology",
    },
  },
  {
    id: "10",
    order: 9,
    layout: "thank-you",
    content: {
      heading: "Спасибо!",
      contactEmail: "digital@sovcombank.ru",
      contactPhone: "+7 (495) 988-00-00",
      contactWebsite: "sovcombank.ru",
    },
  },
];

export default function DemoPage() {
  const [current, setCurrent] = useState(0);
  const [templateId, setTemplateId] = useState("sovcombank");
  const template = getTemplate(templateId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    function calc() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth - 48;
      setScale(Math.min(w / SLIDE_WIDTH, 0.7));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-8 px-4">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-xl font-bold text-neutral-900">Demo: Все типы слайдов</h1>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="text-sm bg-white border border-neutral-200 rounded-lg px-3 py-1.5"
        >
          {templateList.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div
        ref={containerRef}
        className="w-full flex justify-center"
      >
      <div
        className="shadow-2xl rounded-lg overflow-hidden"
        style={{
          width: SLIDE_WIDTH * scale,
          height: SLIDE_HEIGHT * scale,
        }}
      >
        <SlideRenderer
          slide={demoSlides[current]}
          template={template}
          scale={scale}
        />
      </div>
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-neutral-600 tabular-nums min-w-[80px] text-center">
          {current + 1} / {demoSlides.length}
        </span>
        <button
          onClick={() => setCurrent(Math.min(demoSlides.length - 1, current + 1))}
          disabled={current === demoSlides.length - 1}
          className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Slide type label */}
      <div className="mt-3 text-sm text-neutral-500">
        Тип: <span className="font-mono text-neutral-700">{demoSlides[current].layout}</span>
      </div>

      {/* Thumbnails strip */}
      <div className="mt-6 flex gap-2 overflow-x-auto max-w-full px-4">
        {demoSlides.map((slide, i) => {
          const thumbScale = 120 / SLIDE_WIDTH;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 rounded overflow-hidden transition-all ${
                i === current ? "ring-2 ring-red-500 ring-offset-1" : "ring-1 ring-neutral-200"
              }`}
              style={{
                width: 120,
                height: 120 * (SLIDE_HEIGHT / SLIDE_WIDTH),
              }}
            >
              <SlideRenderer
                slide={slide}
                template={template}
                scale={thumbScale}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
