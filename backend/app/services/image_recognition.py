import numpy as np
import pandas as pd
from pathlib import Path
from PIL import Image
from io import BytesIO


class FineTunedFoodRecognizer:
    """ONNX Food Classifier integrated with metadata.csv"""

    def __init__(self, model_dir: str = "model"):
        model_dir = Path(model_dir)

        self.onnx_model_path = model_dir / "final_best_model_v6_final (fine-tuned).onnx"
        self.metadata_path = model_dir / "metadata.csv"

        if not self.onnx_model_path.exists():
            raise FileNotFoundError(f"ONNX model not found: {self.onnx_model_path}")

        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found: {self.metadata_path}")

        # Load metadata
        self.metadata_df = pd.read_csv(self.metadata_path)

        # Load ONNX model
        # Import onnxruntime lazily to keep module import lightweight for non-image flows (tests, non-AI routes).
        import onnxruntime as ort

        self.session = ort.InferenceSession(
            str(self.onnx_model_path),
            providers=["CPUExecutionProvider"]
        )

        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    # -------------------------------
    # PREPROCESS (IMAGE BYTES)
    # -------------------------------
    def _preprocess_image(self, image_bytes: bytes):
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))

        arr = np.array(img).astype(np.float32)

        arr = np.expand_dims(arr, axis=0)
        return arr

    # -------------------------------
    # PREDICT
    # -------------------------------
    def predict(self, image_bytes: bytes, top_k: int = 3):
        x = self._preprocess_image(image_bytes)

        outputs = self.session.run(
            [self.output_name],
            {self.input_name: x}
        )[0]

        probs = outputs[0]
        top_indices = np.argsort(probs)[::-1][:top_k]

        results = []

        for idx in top_indices:
            if idx < len(self.metadata_df):
                row = self.metadata_df.iloc[idx]

                results.append({
                    "class_index": int(idx),
                    "label": row.get("class_name", f"class_{idx}"),
                    "category": row.get("category", "N/A"),
                    "region": row.get("region", "N/A"),
                    "dietary": row.get("dietary", "N/A"),
                    "confidence": float(probs[idx]),
                })
            else:
                results.append({
                    "class_index": int(idx),
                    "label": f"class_{idx}",
                    "confidence": float(probs[idx]),
                })

        return results


""" if __name__ == "__main__":
    print("Testing FineTunedFoodRecognizer with a sample image...")
    recognizer = FineTunedFoodRecognizer(model_dir="../../model")
    with open("idly.jpg", "rb") as f:
        image_bytes = f.read()

    results = recognizer.predict(image_bytes=image_bytes, top_k=3)
    print(results) """
