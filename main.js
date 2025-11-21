import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ============================================
   KONFIGURASI SUPABASE (gunakan anon public key)
=============================================== */
const supabaseUrl = "https://umwvjkgiabdhjdaafsvr.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd3Zqa2dpYWJkaGpkYWFmc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDQzNDAsImV4cCI6MjA3MTk4MDM0MH0.D7k18xqk_V4yT2n7PwYHpYJHaUkgTAwzVzVnF6IU3hY"; // <- isi dengan anon public key dari Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/* ============================================
   DOM ELEMENT
=============================================== */
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const classDropdown = document.getElementById("classDropdown");
const downloadBtn = document.getElementById("downloadBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const downloadExcelBtn = document.getElementById("downloadExcelBtn");
const statusText = document.getElementById("status");

/* ============================================
   CEK SESSION SAAT HALAMAN DIBUKA
=============================================== */
async function checkSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      return;
    }

    if (data.session) {
      // sudah login
      loginSection.classList.add("hidden");
      dashboard.classList.remove("hidden");
      loadClasses();
    }
  } catch (err) {
    console.error("Gagal mengecek session:", err);
  }
}

checkSession();

/* ============================================
   LOGIN USER
=============================================== */
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    loginMessage.textContent = "⚠️ Email dan password wajib diisi.";
    return;
  }

  loginBtn.disabled = true;
  const oldText = loginBtn.textContent;
  loginBtn.textContent = "🔄 Sedang login...";
  loginMessage.textContent = "";

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loginMessage.textContent = "❌ " + error.message;
      return;
    }

    loginMessage.textContent = "✅ Login berhasil!";
    loginSection.classList.add("hidden");
    dashboard.classList.remove("hidden");

    loadClasses();
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "❌ Terjadi kesalahan saat login.";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = oldText;
  }
});

/* ============================================
   LOAD DATA KELAS
=============================================== */
async function loadClasses() {
  statusText.textContent = "🔄 Memuat daftar kelas...";

  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("id");

    if (error) throw error;

    classDropdown.innerHTML = `<option value="">Pilih kelas...</option>`;

    data.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.class_name;
      classDropdown.appendChild(opt);
    });

    statusText.textContent = "";
  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Gagal memuat daftar kelas.";
  }
}

/* ============================================
   HELPER: AMBIL DATA (kelas, siswa, absensi)
=============================================== */
async function fetchClassData(classId) {
  const { data: kelas, error: kelasErr } = await supabase
    .from("classes")
    .select("class_name")
    .eq("id", classId)
    .single();

  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, name")
    .eq("class_id", classId)
    .order("id");

  const { data: attendance, error: attErr } = await supabase
    .from("attendance_today_by_room")
    .select("student_id");

  if (kelasErr || studentErr || attErr) {
    console.error(kelasErr || studentErr || attErr);
    throw new Error("❌ Gagal mengambil data dari server.");
  }

  return {
    kelas,
    students: students || [],
    attendance: attendance || [],
  };
}

/* ============================================
   DOWNLOAD CSV
=============================================== */
downloadBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas terlebih dahulu!");

  statusText.textContent = "🔄 Mengambil data...";

  try {
    const { kelas, students, attendance } = await fetchClassData(classId);

    if (!students.length) {
      statusText.textContent = "⚠️ Tidak ada siswa di kelas ini.";
      return;
    }

    const csv = ["No,ID,Nama,Status"];

    students.forEach((s, i) => {
      const hadir = attendance.some((a) => a.student_id === s.id);
      csv.push(`${i + 1},${s.id},"${s.name}",${hadir ? "Hadir" : "Alfa"}`);
    });

    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Absensi_${kelas.class_name}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    statusText.textContent = "✅ CSV berhasil diunduh.";
  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Gagal membuat CSV.";
  }
});

/* ============================================
   DOWNLOAD PDF
=============================================== */
downloadPdfBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas dahulu!");

  statusText.textContent = "🔄 Membuat PDF...";

  try {
    const { kelas, students, attendance } = await fetchClassData(classId);

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
        { text: i + 1, fillColor: isAlpha ? "#ffd4d4" : null },
        { text: s.id, fillColor: isAlpha ? "#ffd4d4" : null },
        { text: s.name, fillColor: isAlpha ? "#ffd4d4" : null },
        {
          text: hadir ? "Hadir" : "Alfa",
          color: isAlpha ? "red" : "black",
          bold: isAlpha,
        },
      ]);
    });

    const docDefinition = {
      pageMargins: [60, 60, 60, 60],
      content: [
        { text: `Kelas: ${kelas.class_name}`, fontSize: 13, bold: true },
        { text: `Tanggal: ${today}\n\n`, fontSize: 11 },

        {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "*", "auto"],
            body: tableBody,
          },
          layout: "lightHorizontalLines",
        },

        {
          text: "\nCatatan: Hubungi admin jika terdapat data yang salah.",
          alignment: "center",
          italics: true,
          fontSize: 10,
        },
      ],
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`Absensi_${kelas.class_name}.pdf`);
    statusText.textContent = "✅ PDF berhasil diunduh.";
  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Gagal membuat PDF.";
  }
});

/* ============================================
   DOWNLOAD EXCEL
=============================================== */
downloadExcelBtn.addEventListener("click", async () => {
  const classId = classDropdown.value;
  if (!classId) return alert("Pilih kelas terlebih dahulu!");

  statusText.textContent = "🔄 Membuat Excel...";

  try {
    const { kelas, students, attendance } = await fetchClassData(classId);

    const excelData = [["No", "ID", "Nama", "Status"]];
    students.forEach((s, i) => {
      const hadir = attendance.some((a) => a.student_id === s.id);
      excelData.push([i + 1, s.id, s.name, hadir ? "Hadir" : "Alfa"]);
    });

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `Absensi_${kelas.class_name}.xlsx`);

    statusText.textContent = "✅ Excel berhasil diunduh.";
  } catch (err) {
    console.error(err);
    statusText.textContent = "❌ Gagal membuat Excel.";
  }
});
