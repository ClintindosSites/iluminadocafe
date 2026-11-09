"use client";

import {
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Save,
  Store,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  avatarImageUrl: string;
  coverImageUrl: string;
}

export default function ConfiguracoesPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Carrega as informações do restaurante
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const response = await fetch("/api/admin/configuracoes", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar configurações.");
        }

        const currentRestaurant = data.restaurant as Restaurant;

        setRestaurant(currentRestaurant);
        setName(currentRestaurant.name);
        setDescription(currentRestaurant.description);
        setAvatarPreview(currentRestaurant.avatarImageUrl);
        setCoverPreview(currentRestaurant.coverImageUrl);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as configurações.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadRestaurant();
  }, []);

  // Libera URLs temporárias das imagens
  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }

      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [avatarPreview, coverPreview]);

  // Validação e seleção de imagens
  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover",
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Utilize uma imagem JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);

    if (type === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setCoverFile(file);
      setCoverPreview(preview);
    }
  }

  // Salvar configurações
  async function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do restaurante.");
      return;
    }

    if (!description.trim()) {
      toast.error("Informe a descrição do restaurante.");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("description", description.trim());

      if (avatarFile) {
        formData.append("avatarImage", avatarFile);
      }

      if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      const response = await fetch("/api/admin/configuracoes", {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar configurações.");
      }

      const updatedRestaurant = data.restaurant as Restaurant;

      setRestaurant(updatedRestaurant);
      setName(updatedRestaurant.name);
      setDescription(updatedRestaurant.description);

      setAvatarFile(null);
      setCoverFile(null);

      setAvatarPreview(updatedRestaurant.avatarImageUrl);
      setCoverPreview(updatedRestaurant.coverImageUrl);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      toast.success(data.message || "Configurações salvas com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
        <Store className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h2 className="font-semibold text-gray-900">
          Restaurante não encontrado
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Não foi possível carregar os dados do restaurante.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <Store size={16} />
            <span>Administração</span>
            <span>/</span>
            <span className="text-amber-700">Configurações</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Configurações do restaurante
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Gerencie as informações e a identidade visual do seu
            estabelecimento.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}

          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {/* Informações gerais */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Store size={22} />
          </div>

          <div>
            <h3 className="font-bold text-gray-900">Informações gerais</h3>
            <p className="text-xs text-gray-400">
              Dados principais do estabelecimento
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="restaurant-name"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Nome do restaurante
            </label>

            <input
              id="restaurant-name"
              type="text"
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do restaurante"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {name.length}/120 caracteres
            </p>
          </div>

          <div>
            <label
              htmlFor="restaurant-description"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Descrição do restaurante
            </label>

            <textarea
              id="restaurant-description"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Conte um pouco sobre seu restaurante..."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {description.length}/2000 caracteres
            </p>
          </div>
        </div>
      </section>

      {/* Identidade visual */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <ImageIcon size={22} />
          </div>

          <div>
            <h3 className="font-bold text-gray-900">Identidade visual</h3>
            <p className="text-xs text-gray-400">
              Personalize as imagens do seu cardápio
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Logo */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              Logo do restaurante
            </h4>

            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
              <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Logo do restaurante"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store size={40} className="text-gray-300" />
                )}
              </div>

              <p className="mt-4 text-sm font-semibold text-gray-800">
                Imagem de perfil
              </p>

              <p className="mt-1 text-center text-xs text-gray-400">
                JPG, PNG ou WEBP · Máximo 5 MB
              </p>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => handleImageChange(event, "avatar")}
              />

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-amber-700 hover:text-amber-800"
              >
                <Camera size={17} />
                Alterar logo
              </button>

              {avatarFile && (
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-green-700">
                  <Check size={14} />
                  Nova imagem selecionada
                </div>
              )}
            </div>
          </div>

          {/* Capa */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-700">
              Imagem de capa
            </h4>

            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-200">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Capa do restaurante"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon size={40} className="text-gray-400" />
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm font-semibold text-gray-800">
                Banner do cardápio
              </p>

              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG ou WEBP · Máximo 5 MB
              </p>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => handleImageChange(event, "cover")}
              />

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-amber-700 hover:text-amber-800"
              >
                <Upload size={17} />
                Alterar capa
              </button>

              {coverFile && (
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-green-700">
                  <Check size={14} />
                  Nova imagem selecionada
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Prévia */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5 md:p-7">
          <h3 className="font-bold text-gray-900">
            Prévia da identidade visual
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Veja como seu restaurante está sendo apresentado.
          </p>
        </div>

        <div className="p-5 md:p-7">
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="relative h-40 bg-gray-100 sm:h-52">
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="Prévia da capa"
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="relative flex items-end gap-4 px-5 pb-5">
              <div className="-mt-10 h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                {avatarPreview && (
                  <img
                    src={avatarPreview}
                    alt="Prévia da logo"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 pb-1">
                <h4 className="truncate font-bold text-gray-900">
                  {name || "Nome do restaurante"}
                </h4>

                <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                  {description || "Descrição do restaurante"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-amber-50 p-5 sm:flex-row">
        <div>
          <p className="text-sm font-semibold text-amber-950">
            Tudo pronto para atualizar?
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Suas alterações serão refletidas no cardápio do restaurante.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-900 disabled:opacity-60 sm:w-auto"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}

          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
