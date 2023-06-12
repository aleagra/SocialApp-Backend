const express = require("express");
const multer = require("multer");
const MulterGoogleStorage = require("multer-google-storage");
const path = require("path");
const app = express();
require("dotenv").config();

const bucketName = "socialapp-storage-94b01.appspot.com";
console.log("Bucket:", bucketName);

const storage = MulterGoogleStorage.storageEngine({
  projectId: "socialapp-storage-94b01",
  keyFilename: "storage.json",
  bucket: bucketName,
});
const upload = multer({ storage: storage });

app.use(express.static(__dirname));
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const downloadURL = await uploadFileToFirebaseStorage(file);

    // Aquí puedes guardar la URL de descarga en la base de datos o realizar otras operaciones necesarias

    return res.status(200).json("Archivo subido correctamente");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Error al subir el archivo");
  }
});

// Función para subir un archivo al almacenamiento de Firebase
const uploadFileToFirebaseStorage = async (file) => {
  try {
    const admin = require("firebase-admin");
    const serviceAccount = require("./storage/storage.json");

    // Inicializar la aplicación de administración de Firebase
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "socialapp-storage-94b01.appspot.com",
    });

    const bucket = admin.storage().bucket();

    const fileName = new Date().getTime() + file.originalname;
    const fileRef = bucket.file(fileName);
    const fileStream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    await new Promise((resolve, reject) => {
      fileStream.on("error", (error) => reject(error));
      fileStream.on("finish", () => resolve());
      fileStream.end(file.buffer);
    });

    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return downloadURL;
  } catch (error) {
    throw error;
  }
}

// Resto del código...

app.listen(process.env.PORT, () => {
  console.log(`Server started on ${process.env.PORT}`);
});