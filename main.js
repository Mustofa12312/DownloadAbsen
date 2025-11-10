import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔗 Ganti sesuai project Supabase kamu
const supabaseUrl = "https://umwvjkgiabdhjdaafsvr.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3Zqa2dpYWJkaGpkYWFmc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDQzNDAsImV4cCI6MjA3MTk4MDM0MH0.D7k18xqk_V4yT2n7PwYHpYJHaUkgTAwzVzVnF6IU3hY"; // ISI KUNCI ANON ANDA
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

// ✅ LOGIN
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

// ✅ LOAD KELAS
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

// ✅ DOWNLOAD CSV
downloadBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas terlebih dahulu!");

  statusText.textContent = "🔄 Mengambil data...";

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_id")
    .eq("class_id", classId)
    .order("id");

  const { data: attendance } = await supabase
    .from("attendance_today_by_room")
    .select("student_id");

  const csvRows = ["No,ID,Nama,Status"];
  students.forEach((s, i) => {
    const hadir = attendance.some((a) => a.student_id === s.id);
    csvRows.push(`${i + 1},${s.id},"${s.name}",${hadir ? "Hadir" : "Alfa"}`);
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `absensi_kelas_${classId}.csv`;
  a.click();

  statusText.textContent = "✅ CSV berhasil diunduh";
});

// ✅ DOWNLOAD PDF CANTIK + WARNA ALFA MERAH
downloadPdfBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas dahulu!");

  statusText.textContent = "🔄 Menyusun PDF...";

  const { data: kelas } = await supabase
    .from("classes")
    .select("class_name")
    .eq("id", classId)
    .single();

  const { data: students } = await supabase
    .from("students")
    .select("id, name")
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
      { text: (i + 1).toString(), fillColor: isAlpha ? "#ffb3b3" : null },
      { text: s.id.toString(), fillColor: isAlpha ? "#ffb3b3" : null },
      { text: s.name, fillColor: isAlpha ? "#ffb3b3" : null },
      {
        text: hadir ? "Hadir" : "Alfa",
        color: isAlpha ? "red" : "black",
        bold: isAlpha,
      },
    ]);
  });

  const docDefinition = {
    pageMargins: [40, 50, 40, 40],
    content: [
      { text: "Daftar Absensi", style: "title", alignment: "center" },
      { text: `Kelas: ${kelas.class_name}`, style: "sub", alignment: "center" },
      {
        text: `Tanggal: ${today}`,
        style: "sub",
        alignment: "center",
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      sub: { fontSize: 11 },
    },
    defaultStyle: { fontSize: 10 },
  };

  pdfMake.createPdf(docDefinition).download(`Absensi_${kelas.class_name}.pdf`);
  statusText.textContent = "✅ PDF berhasil diunduh";
});
