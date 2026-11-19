// Специальности в БД хранятся русским текстом, и тот же текст уходит в API как фильтр
// (GET /api/doctors?specialty=Кардиолог). Поэтому «значение» (value) НЕЛЬЗЯ переводить —
// это часть контракта с сервером; переводится только подпись (label) на экране.
export const SPECIALTIES = [
  { id: "therapist",     value: "Терапевт"    },
  { id: "cardiologist",  value: "Кардиолог"   },
  { id: "surgeon",       value: "Хирург"      },
  { id: "neurologist",   value: "Невролог"    },
  { id: "pediatrician",  value: "Педиатр"     },
  { id: "dentist",       value: "Стоматолог"  },
  { id: "dermatologist", value: "Дерматолог"  },
  { id: "ophthalmologist", value: "Офтальмолог" },
];

// Подпись специальности на текущем языке. Для специальностей вне списка (админ может завести
// любую) возвращает исходный текст как есть — перевод данных из БД вне scope локализации интерфейса.
export const specialtyLabel = (value, t) => {
  const s = SPECIALTIES.find((x) => x.value === value);
  return s ? t(`specialties.${s.id}`) : value;
};
