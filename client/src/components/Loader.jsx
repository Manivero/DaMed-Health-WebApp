import { useTranslation } from "react-i18next";

// text — необязательный переопределяемый текст (страницы пока передают свой, русский — их
// локализуют отдельные задачи); по умолчанию берётся из словаря.
export default function Loader({ text }) {
  const { t } = useTranslation();
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"64px 0",gap:14 }}>
      <div className="loader-ring" />
      <p style={{ color:"var(--muted)",fontSize:14 }}>{text ?? t("loader.loading")}</p>
    </div>
  );
}
