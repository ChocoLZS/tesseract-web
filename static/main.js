function _debounce(fn, delay) {
    var timer = null;
    return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
}

const droparea = document.querySelector("#drop-box");
const dropoverlay = document.querySelector("#drop-overlay");
const input = document.querySelector("#uploadimage");

state = {
    isDragging: false,
    wrongFile: false,
    file: null,
};

input.addEventListener("change", () => {
    const files = input.files;
    onDrop(files[0]);
});

const onDragOver = _debounce(() => {
    if (state.isDragging) return;
    state.isDragging = true;
    dropoverlay.style.opacity = 1;
}, 16.67);

const onDragLeave = _debounce(() => {
    if (!state.isDragging) return;
    state.isDragging = false;
    dropoverlay.style.opacity = 0;
}, 16.67);

const displayImage = () => {
    document.querySelector("#ocr-img").src = URL.createObjectURL(state.file);
    document.querySelector("#ocr-img").classList.remove("hidden");
    document.querySelector("#ocr-pdf").classList.add("hidden");
};

const displayPdf = () => {
    document.querySelector("#ocr-img").classList.add("hidden");
    document.querySelector("#ocr-pdf").src = URL.createObjectURL(state.file);
    document.querySelector("#ocr-pdf").classList.remove("hidden");
};

const onDrop = (file) => {
    // allows image only
    if (file.type.indexOf("image/") >= 0) {
        state.file = file;
        displayImage();
    }
    if (file.type.indexOf("application/pdf") >= 0) {
        state.file = file;
        displayPdf();
    }
};

droparea.addEventListener("drop", (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    onDrop(files[0]);
    onDragLeave();
});

document.querySelector("#ocr-img").addEventListener("drop", (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    onDrop(files[0]);
});

droparea.addEventListener("dragover", (event) => {
    // prevent default to allow drop
    event.preventDefault();
    onDragOver();
});

droparea.addEventListener("dragleave", (event) => {
    event.preventDefault();
    const rect = droparea.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        onDragLeave();
    }
});

document.onpaste = (event) => {
    event.preventDefault();
    var items = event.clipboardData?.items;
    for (let index in items) {
        var item = items[index];
        if (item.kind === "file") {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (pasteEvent) => {
                state.imageSource = pasteEvent.target?.result;
            };
            reader.readAsDataURL(blob);
            onDrop(blob);
        }
    }
};

function doOCR() {
    if (!state.file) {
        Toastify({
            text: `请选择一个文件`,
            style: {
                background: "#00a6ed",
                color: "white",
            },
        }).showToast();
        return;
    }
    if (
        !(state.file.type.indexOf("image/") >= 0) &&
        !(state.file.type.indexOf("application/pdf") >= 0)
    ) {
        Toastify({
            text: `请选择一个图片或 PDF 文件`,
            style: {
                background: "#00a6ed",
                color: "white",
            },
        }).showToast();
        return;
    }
    const resultEl = document.querySelector("#resulttext");
    var data = new FormData();
    const language = document.getElementById("source_lang").value;
    data.append("file", state.file);
    data.append("language", language);
    resultEl.value = "Scanning...";
    fetch("/api/ocr", {
        method: "POST",
        body: data,
    })
        .then((response) => response.json())
        .then((result) => {
            resultEl.value = result.error || result.text;
            // change result style
            resultEl.style.height = resultEl.scrollHeight + "px";
        })
        .catch((err) => {
            resultEl.value = "";
            Toastify({
                text: `OCR 失败: ${err}`,
                style: {
                    background: "#ff4b4b",
                    color: "white",
                },
            }).showToast();
        });
}

function doCopy() {
    const resultEl = document.querySelector("#resulttext");
    const textToCopy = resultEl.value;
    if (navigator.clipboard) {
        // 使用 Clipboard API 复制文本
        navigator.clipboard
            .writeText(textToCopy)
            .then(function () {
                Toastify({
                    text: "复制成功",
                    style: {
                        background: "#00d26a",
                        color: "white",
                    },
                }).showToast();
            })
            .catch(function (err) {
                Toastify({
                    text: `复制失败: ${err}`,
                    style: {
                        background: "#ff4b4b",
                        color: "white",
                    },
                }).showToast();
            });
    } else {
        // 兼容处理：使用旧的 execCommand 方法
        resultEl.select();
        try {
            const successful = document.execCommand("copy");
            const msg = successful ? "复制成功" : "复制失败";
            Toastify({
                text: msg,
                style: {
                    background: "#00d26a",
                    color: "white",
                },
            }).showToast();
        } catch (err) {
            Toastify({
                text: `复制失败: ${err}`,
                style: {
                    background: "#ff4b4b",
                    color: "white",
                },
            }).showToast();
        }
        window.getSelection().removeAllRanges();
    }
}
