"use client";

import {
  AlertCircle,
  FolderOpen,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    products: number;
  };
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/categorias", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar categorias.");
      }

      setCategories(data.categories);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as categorias.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setName("");
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/categorias/${editingId}`
          : "/api/admin/categorias",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: normalizedName }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível salvar.");
      }

      toast.success(
        editingId
          ? "Categoria atualizada com sucesso!"
          : "Categoria cadastrada com sucesso!",
      );

      resetForm();
      await loadCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar categoria.",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(
      category._count.products > 0
        ? `A categoria "${category.name}" possui ${category._count.products} produto(s). Transfira os produtos para outra categoria antes de excluí-la.`
        : `Tem certeza que deseja excluir a categoria "${category.name}"?`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);

    try {
      const response = await fetch(`/api/admin/categorias/${category.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível excluir.");
      }

      toast.success("Categoria excluída com sucesso!");

      if (editingId === category.id) {
        resetForm();
      }

      await loadCategories();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir categoria.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalProducts = categories.reduce(
    (total, category) => total + category._count.products,
    0,
  );

  return (
    <div className="space-y-7 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <FolderOpen size={16} />
            <span>Gerenciamento</span>
            <span>/</span>
            <span className="text-amber-700">Categorias</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Categorias do cardápio
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Organize os produtos do seu restaurante.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <Tags size={19} />
          {categories.length} categorias
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de categorias</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {categories.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Tags size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Produtos organizados</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Package size={23} />
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">
              {editingId ? "Editar categoria" : "Cadastrar nova categoria"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {editingId
                ? "Altere o nome da categoria."
                : "Adicione uma nova categoria ao cardápio."}
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Cancelar edição"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Cafés, Salgados, Bolos e doces..."
            maxLength={80}
            required
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
          />

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : editingId ? (
              <Pencil size={18} />
            ) : (
              <Plus size={19} />
            )}

            {saving
              ? "Salvando..."
              : editingId
                ? "Salvar alterações"
                : "Cadastrar categoria"}
          </button>
        </form>
      </section>

      {/* Listagem */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-gray-900">Categorias cadastradas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie todas as categorias do restaurante.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar categoria..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-gray-500">
            <Loader2 size={22} className="animate-spin text-amber-700" />
            Carregando categorias...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FolderOpen size={27} />
            </div>

            <h4 className="font-semibold text-gray-800">
              {search
                ? "Nenhuma categoria encontrada"
                : "Nenhuma categoria cadastrada"}
            </h4>

            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {search
                ? "Tente pesquisar por outro nome."
                : "Cadastre sua primeira categoria para começar a organizar os produtos."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                    <Tags size={22} />
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate font-semibold text-gray-900">
                      {category.name}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <Package size={14} />
                      {category._count.products}{" "}
                      {category._count.products === 1 ? "produto" : "produtos"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(category)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                  >
                    <Pencil size={16} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={
                      deletingId === category.id || category._count.products > 0
                    }
                    title={
                      category._count.products > 0
                        ? "Transfira os produtos antes de excluir."
                        : "Excluir categoria"
                    }
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deletingId === category.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Excluir
                  </button>
                </div>

                {category._count.products > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-700 sm:hidden">
                    <AlertCircle size={13} />
                    Transfira os produtos para excluir esta categoria.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
