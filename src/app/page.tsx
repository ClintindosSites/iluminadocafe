import Image from "next/image";
import Link from "next/link";

const HomePage = () => {
  return (
    <section className="flex h-screen flex-col items-center justify-center bg-red-800 px-20">
      <h1 className="text-center text-xl font-bold uppercase text-white">
        Iluminado café <br /> O sabor que encanta quem experimenta
      </h1>

      <Image
        src="/logo.webp"
        width={400}
        height={400}
        alt="Logomarca de Iluminado café"
      />
      <div className="mb-10">
        <p className="text-center text-white">
          Lanchonete e Restaurante com comida mineira de qualidade com entrega
          rápida em Belo Horizonte. Visite nosso cardápio e faça seu pedido
          agora mesmo ou agende seu pedido e receba no horário agendado.
        </p>
      </div>
      <Link
        href={"/iluminado-cafe"}
        className="rounded-full bg-white px-5 py-3 font-bold uppercase"
      >
        {" "}
        Visitar Cardápio{" "}
      </Link>
    </section>
  );
};

export default HomePage;
