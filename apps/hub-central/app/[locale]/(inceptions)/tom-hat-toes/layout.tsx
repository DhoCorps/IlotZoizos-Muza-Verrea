import Sidebar from "../../../../components/navigation/Sidebar"; // Ton nouveau composant

export default function InceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {/* 🦅 Ta Boussole Flottante à gauche */}
      <Sidebar />

      {/* 🌍 Le reste de l'Îlot (Tes pages comme tom-hat-toes) */}
      <main className="pl-40 pr-8 py-8"> 
        {/* On ajoute du padding à gauche (pl-24) pour ne pas que le contenu soit caché par le Header */}
        {children}
      </main>
    </div>
  );
}