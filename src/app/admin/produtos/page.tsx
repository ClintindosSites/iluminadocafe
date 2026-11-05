"use client";

import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { formatCurrency } from "@/helpers/format-currency";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  ingredients: string[];
  isAvailable: boolean;
  menuCategory: Category;
}

const initialForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  ingredients: "",
  isAvailable: true,
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/produtos", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar produtos.");
      }

      setProducts(data.products);
      setCategories(data.categories);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar produtos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "available" && product.isAvailable) ||
        (filter === "unavailable" && !product.isAvailable);

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const finalPrice = Number(form.price) * 1.1;

  function resetForm() {
    setForm(initialForm);
    setImage(null);
    setPreview("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      categoryId: product.menuCategory.id,
      ingredients: product.ingredients.join(", "),
      isAvailable: product.isAvailable,
    });
    setImage(null);
    setPreview(product.imageUrl);
    setError("");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageChange(file: File | null) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Selecione uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.description.trim()) {
      setError("Preencha o nome e a descrição do produto.");
      return;
    }

    if (!form.categoryId) {
      setError("Selecione uma categoria.");
      return;
    }

    if (!form.price || !Number.isFinite(Number(form.price))) {
      setError("Informe um preço válido.");
      return;
    }

    if (!editingId && !image) {
      setError("Selecione uma imagem para o produto.");
      return;
    }

    const formData = new FormData();

    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("price", form.price.replace(",", "."));
    formData.append("categoryId", form.categoryId);
    formData.append("ingredients", form.ingredients);
    formData.append("isAvailable", String(form.isAvailable));

    if (image) {
      formData.append("image", image);
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId ? `/api/admin/produtos/${editingId}` : "/api/admin/produtos",
        {
          method: editingId ? "PATCH" : "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível salvar o produto.");
      }

      setSuccess(
        editingId
          ? "Produto atualizado com sucesso!"
          : "Produto cadastrado com sucesso!",
      );

      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(product: Product) {
    const formData = new FormData();

    formData.append("name", product.name);
    formData.append("description", product.description);
    formData.append("price", String(product.price));
    formData.append("categoryId", product.menuCategory.id);
    formData.append("ingredients", product.ingredients.join(", "));
    formData.append("isAvailable", String(!product.isAvailable));

    try {
      const response = await fetch(`/api/admin/produtos/${product.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível alterar o produto.");
      }

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao alterar disponibilidade.",
      );
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Deseja desativar "${product.name}"? O histórico dos pedidos será preservado.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/produtos/${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível desativar o produto.");
      }

      setSuccess("Produto desativado com sucesso!");
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao desativar produto.",
      );
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-amber-700">
            Gerenciamento do cardápio
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-900">Produtos</h2>

          <p className="mt-1 text-sm text-gray-500">
            Cadastre, edite e organize os produtos do restaurante.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          <Plus size={19} />
          Novo produto
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError("")} aria-label="Fechar erro">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess("")} aria-label="Fechar aviso">
            <X size={18} />
          </button>
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Editar produto" : "Cadastrar produto"}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Preencha as informações do produto.
              </p>
            </div>

            <button
              onClick={resetForm}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              aria-label="Fechar formulário"
            >
              <X size={21} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nome do produto *
                </label>

                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                  required
                  placeholder="Ex.: Pão de queijo"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Categoria *
                </label>

                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-600"
                >
                  <option value="">Selecione uma categoria</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {categories.length === 0 && (
                  <p className="mt-2 text-xs text-red-600">
                    Cadastre uma categoria antes de criar um produto.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Descrição *
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                maxLength={2000}
                required
                rows={3}
                placeholder="Descreva o produto..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Preço original (R$) *
                </label>

                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  min="0.01"
                  max="100000"
                  step="0.01"
                  required
                  placeholder="10,00"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-600"
                />

                {Number(form.price) > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">
                      Preço ilustrativo com acréscimo de 10%
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-900">
                      {formatCurrency(finalPrice)}
                    </p>
                    <p className="text-xs text-amber-700">
                      Base: {formatCurrency(Number(form.price))} · Comissão:{" "}
                      {formatCurrency(Number(form.price) * 0.1)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Ingredientes
                </label>

                <textarea
                  value={form.ingredients}
                  onChange={(e) =>
                    setForm({ ...form, ingredients: e.target.value })
                  }
                  rows={4}
                  placeholder="Queijo, leite, polvilho..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-amber-600"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Separe os ingredientes por vírgulas.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Imagem do produto {!editingId && "*"}
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 transition hover:border-amber-400 sm:max-w-xs">
                  <ImagePlus size={27} className="text-gray-400" />

                  <span className="mt-2 text-sm font-semibold text-gray-600">
                    Selecionar imagem
                  </span>

                  <span className="mt-1 text-xs text-gray-400">
                    JPG, PNG ou WEBP · Máximo 5 MB
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      handleImageChange(e.target.files?.[0] ?? null)
                    }
                  />
                </label>

                {preview && (
                  <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-gray-200">
                    <Image
                      src={preview}
                      alt="Prévia do produto"
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                )}
              </div>
            </div>

            {editingId && (
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm({ ...form, isAvailable: e.target.checked })
                  }
                  className="h-4 w-4 accent-amber-700"
                />
                Produto disponível para venda
              </label>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving || categories.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Salvando...
                  </>
                ) : editingId ? (
                  "Salvar alterações"
                ) : (
                  "Cadastrar produto"
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total de produtos</p>
            <Package size={19} className="text-amber-700" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {products.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Disponíveis</p>
            <Eye size={19} className="text-green-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {products.filter((p) => p.isAvailable).length}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Indisponíveis</p>
            <EyeOff size={19} className="text-gray-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {products.filter((p) => !p.isAvailable).length}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Todos os produtos</h3>
            <p className="mt-1 text-sm text-gray-400">
              {filteredProducts.length} produto(s) encontrado(s)
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-amber-600 sm:w-56"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none"
            >
              <option value="all">Todos</option>
              <option value="available">Disponíveis</option>
              <option value="unavailable">Indisponíveis</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-amber-700" size={30} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <Package size={38} className="text-gray-300" />
            <h4 className="mt-4 font-semibold text-gray-800">
              Nenhum produto encontrado
            </h4>
            <p className="mt-1 text-sm text-gray-400">
              Cadastre seu primeiro produto ou altere sua pesquisa.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 sm:flex-row sm:items-center"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {product.name}
                    </h4>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.isAvailable
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {product.isAvailable ? "Disponível" : "Indisponível"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-400">
                    {product.menuCategory.name}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {formatCurrency(product.price)}{" "}
                    <span className="text-xs text-gray-400">
                      (preço original)
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    onClick={() => toggleAvailability(product)}
                    title={
                      product.isAvailable
                        ? "Indisponibilizar"
                        : "Disponibilizar"
                    }
                    className="rounded-lg border border-gray-200 p-2.5 text-gray-500 transition hover:bg-gray-100"
                  >
                    {product.isAvailable ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>

                  <button
                    onClick={() => openEditForm(product)}
                    title="Editar produto"
                    className="rounded-lg border border-gray-200 p-2.5 text-amber-700 transition hover:bg-amber-50"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    onClick={() => deleteProduct(product)}
                    title="Desativar produto"
                    className="rounded-lg border border-gray-200 p-2.5 text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
