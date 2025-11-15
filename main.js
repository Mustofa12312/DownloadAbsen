import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase
const supabaseUrl = "https://umwvjkgiabdhjdaafsvr.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3Zqa2dpYWJkaGpkYWFmc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDQzNDAsImV4cCI6MjA3MTk4MDM0MH0.D7k18xqk_V4yT2n7PwYHpYJHaUkgTAwzVzVnF6IU3hY";
const supabase = createClient(supabaseUrl, supabaseKey);

// DOM
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");
const classDropdown = document.getElementById("classDropdown");
const downloadBtn = document.getElementById("downloadBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const statusText = document.getElementById("status");

// ======================= LOGIN ============================
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  loginMessage.textContent = "🔄 Sedang login...";
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginMessage.textContent = "❌ " + error.message;
  } else {
    loginMessage.textContent = "✅ Login berhasil";
    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadClasses();
  }
});

// ======================= LOAD KELAS ============================
async function loadClasses() {
  statusText.textContent = "🔄 Memuat daftar kelas...";

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("id");

  if (error) return (statusText.textContent = "❌ Error memuat kelas");

  classDropdown.innerHTML = '<option value="">Pilih kelas...</option>';
  data.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.class_name;
    classDropdown.appendChild(opt);
  });

  statusText.textContent = "";
}

// ======================= DOWNLOAD CSV ============================
downloadBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas!");

  statusText.textContent = "🔄 Mengambil data...";

  const { data: students } = await supabase
    .from("students")
    .select("id,name")
    .eq("class_id", classId)
    .order("id");

  const { data: attendance } = await supabase
    .from("attendance_today_by_room")
    .select("student_id");

  const csv = ["No,ID,Nama,Status"];

  students.forEach((s, i) => {
    const hadir = attendance.some((a) => a.student_id === s.id);
    csv.push(`${i + 1},${s.id},"${s.name}",${hadir ? "Hadir" : "Alfa"}`);
  });

  const blob = new Blob([csv.join("\n")], { type: "text/csv" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `absensi_kelas_${classId}.csv`;
  a.click();

  statusText.textContent = "✅ CSV berhasil diunduh";
});

// ======================= DOWNLOAD PDF ============================
downloadPdfBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas dulu!");

  statusText.textContent = "🔄 Membuat PDF...";

  const { data: kelas } = await supabase
    .from("classes")
    .select("class_name")
    .eq("id", classId)
    .single();

  const { data: students } = await supabase
    .from("students")
    .select("id,name")
    .eq("class_id", classId)
    .order("id");

  const { data: attendance } = await supabase
    .from("attendance_today_by_room")
    .select("student_id");

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const tableBody = [
    [
      { text: "No", bold: true },
      { text: "ID", bold: true },
      { text: "Nama", bold: true },
      { text: "Status", bold: true },
    ],
  ];

  students.forEach((s, i) => {
    const hadir = attendance.some((a) => a.student_id === s.id);
    const isAlpha = !hadir;

    tableBody.push([
      { text: (i + 1).toString(), fillColor: isAlpha ? "#ffd4d4" : null },
      { text: s.id.toString(), fillColor: isAlpha ? "#ffd4d4" : null },
      { text: s.name, fillColor: isAlpha ? "#ffd4d4" : null },
      {
        text: hadir ? "Hadir" : "Alfa",
        color: isAlpha ? "red" : "black",
        bold: isAlpha,
      },
    ]);
  });

  // Convert logo ke Base64 agar pasti terbaca
  const logoBase64 = await loadImageAsBase64("logo_madrasah.png");

  const docDefinition = {
    pageMargins: [70, 60, 70, 60],

    header: {
      columns: [
        {
          image: logoBase64,
          width: 70,
          alignment: left,
          margin: [30, 20, 0, 10],
        },
        {
          text: "ABSEN MADRASAH",
          alignment: "center",
          fontSize: 16,
          bold: true,
          margin: [0, 10, 0, 0],
        },
      ],
    },

    background: {
      text: "LPNS ABSEN",
      color: "gray",
      opacity: 0.15,
      bold: true,
      fontSize: 60,
      alignment: "center",
      margin: [0, 200],
    },

    content: [
      {
        text: `Kelas: ${kelas.class_name}\nTanggal: ${today}`,
        margin: [0, 10],
        fontSize: 12,
      },

      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 10],
      },

      {
        text: "Mohon jika ada kesalahan data, harap hubungi pihak terkait.",
        alignment: "center",
        italics: true,
        fontSize: 9,
        margin: [0, 20],
      },
    ],

    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "Sistem Absensi Madrasah", italics: true, fontSize: 8 },
        {
          text: `${currentPage} / ${pageCount}`,
          alignment: "right",
          fontSize: 8,
        },
      ],
      margin: [40, 10],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`Absensi_${kelas.class_name}.pdf`);
  statusText.textContent = "✅ PDF berhasil diunduh";
});

// Fungsi Load Logo
async function loadImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
