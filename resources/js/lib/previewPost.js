export async function previewPost(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content ?? "",
        },
        credentials: "same-origin",
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
        const message = result.errors ? Object.values(result.errors).flat()[0] : result.message;
        throw new Error(message ?? "Não foi possível calcular a pré-visualização.");
    }
    return result;
}
