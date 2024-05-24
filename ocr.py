import os
import pathlib

import pdf2image
import pytesseract
from flask import Flask, jsonify, render_template, request
from langcodes import Language
from PIL import Image
from werkzeug.utils import secure_filename

__author__ = "Santhosh Thottingal <santhosh.thottingal@gmail.com>"
__source__ = "https://github.com/santhoshtr/tesseract-web"

# tesseract --list-langs
langs_we_needed = {
    'chi_sim': "简中",
    "chi_sim_vert": "简中(垂直)",
    "chi_tra": "繁中",
    "chi_tra_vert": "繁中(垂直)",
    "jpn": "日语",
    "jpn_vert": "日语(垂直)",
}

app = Flask(__name__)
UPLOAD_FOLDER = "./static/uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
app.config["SUPPORTED_FORMATS"] = ["png", "jpeg",
                                   "jpg", "bmp", "pnm", "gif", "tiff", "webp", "pdf"]


def pdf_to_img(pdf_file):
    return pdf2image.convert_from_path(pdf_file)


def ocr_core(image: Image, language="chi_sim"):
    text = pytesseract.image_to_string(
        image, lang=language)
    return text


def pdf_to_text(pdf_file_path: str, language="chi_sim") -> str:
    texts = []
    images = pdf_to_img(pdf_file_path)
    for _pg, img in enumerate(images):
        texts.append(ocr_core(img, language))

    return "\n".join(texts)


def get_languages() -> dict:
    languages = {}
    alpha3codes = pytesseract.get_languages()
    alpha3codes_we_needed = [
        string for string in alpha3codes if string in langs_we_needed
    ]
    for code in alpha3codes_we_needed:
        languages[code] = langs_we_needed[code]

    return languages


@app.route("/", methods=["GET", "POST"])
def index():
    return render_template("index.html", languages=get_languages())


@app.route("/api/languages", methods=["GET"])
def listSupportedLanguages():
    return jsonify(languages=get_languages())


@app.route("/api/ocr", methods=["POST"])
def ocr():
    f = request.files["file"]
    language = request.form.get("language", default="en")
    # create a secure filename
    filename = secure_filename(f.filename)
    file_extension = pathlib.Path(filename).suffix.split(".")[1]
    if file_extension not in app.config["SUPPORTED_FORMATS"]:
        return jsonify(error="File format not supported")

    # save file to /static/uploads
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    f.save(filepath)

    if file_extension == "pdf":
        # perform OCR on PDF
        text = pdf_to_text(filepath, language)
    else:
        # perform OCR on the processed image
        text = ocr_core(Image.open(filepath), language)

    # remove the processed image
    os.remove(filepath)

    return jsonify(text=text)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
