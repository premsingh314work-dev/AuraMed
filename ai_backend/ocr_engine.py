from pypdf import PdfReader
import os
import base64

def encode_file_to_base64(file_path: str) -> str:
    """Encode a local file to a base64 string."""
    with open(file_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def process_document(file_path: str) -> dict:
    """
    Process document:
    - If PDF has selectable text: returns type="text"
    - If PDF is image-only (scanned): extracts embedded images and returns type="image" with base64 data
    - If image file (PNG/JPG): returns type="image" with base64 data
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            text = text.strip()
            # If we extracted significant text, return it directly
            if len(text) > 100:
                print("PDF text extracted successfully using pypdf.")
                return {"type": "text", "data": text}
            
            # Scanned PDF fallback: Extract embedded images
            print("PDF has no selectable text. Attempting to extract embedded images for Vision AI...")
            for page in reader.pages:
                for image_obj in page.images:
                    # Return the first image found
                    img_data = base64.b64encode(image_obj.data).decode('utf-8')
                    return {"type": "image", "data": img_data}
            
            # If no text and no images found
            return {"type": "text", "data": text}
            
        except Exception as e:
            print(f"Error processing PDF: {e}")
            return {"type": "text", "data": f"Error parsing PDF: {str(e)}"}
            
    elif ext in [".png", ".jpg", ".jpeg"]:
        try:
            img_data = encode_file_to_base64(file_path)
            return {"type": "image", "data": img_data}
        except Exception as e:
            print(f"Error reading image: {e}")
            return {"type": "text", "data": f"Error reading image: {str(e)}"}
            
    return {"type": "text", "data": "Unsupported file format."}
