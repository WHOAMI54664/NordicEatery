const labels = {
  ru: {
    edit: "Изменить текст",
    save: "Сохранить",
    saving: "Сохранение…",
    cancel: "Отмена",
    text: "Текст",
    hint: "Изменение сохранится для текущего языка. Сохраните параметры в фигурных скобках, например {count}.",
    error: "Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.",
    invalid:
      "Сохраните параметры в фигурных скобках и корректный формат текста.",
    forbidden: "Для редактирования войдите как владелец или администратор.",
  },
  sv: {
    edit: "Redigera text",
    save: "Spara",
    saving: "Sparar…",
    cancel: "Avbryt",
    text: "Text",
    hint: "Ändringen sparas för detta språk. Behåll parametrar inom klamrar, till exempel {count}.",
    error: "Kunde inte spara. Kontrollera anslutningen och försök igen.",
    invalid: "Behåll parametrarna inom klamrar och korrekt textformat.",
    forbidden: "Logga in som ägare eller administratör för att redigera.",
  },
  en: {
    edit: "Edit text",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    text: "Text",
    hint: "Changes apply to this language. Keep parameters in braces, for example {count}.",
    error: "Could not save. Check your connection and try again.",
    invalid: "Keep the parameters in braces and valid text formatting.",
    forbidden: "Sign in as an owner or administrator to edit.",
  },
  pl: {
    edit: "Edytuj tekst",
    save: "Zapisz",
    saving: "Zapisywanie…",
    cancel: "Anuluj",
    text: "Tekst",
    hint: "Zmiana dotyczy tego języka. Zachowaj parametry w nawiasach, np. {count}.",
    error: "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.",
    invalid: "Zachowaj parametry w nawiasach i poprawny format tekstu.",
    forbidden: "Zaloguj się jako właściciel lub administrator, aby edytować.",
  },
};
export function editorLabels(locale: string) {
  return labels[locale as keyof typeof labels] || labels.sv;
}
