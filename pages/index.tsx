import { analyzeFile } from '../lib/openaiVision';
import { useState } from 'react';

export default function Home() {
  const [fileName, setFileName] = useState('');
  const [basins, setBasins] = useState<any[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64 })
        });

        const { result } = await response.json();

        if (!result) {
          console.error('No result from API:', response);
          alert('AI returned no result. Try a different image or check your API.');
          return;
        }

        const parsed = JSON.parse(result);
        setBasins(parsed);

      } catch (error) {
        console.error('AI error:', error);
        alert('Something went wrong. Try a different file or check your setup.');
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>AI Designer – Nyloplast Basin Scanner</h1>

      <input type="file" accept="application/pdf,image/*" onChange={handleUpload} />

      {fileName && <p style={{ marginTop: '1rem' }}>Uploaded: <strong>{fileName}</strong></p>}

      {basins.length > 0 && (
        <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Structure ID</th>
              <th>Diameter</th>
              <th>Height</th>
              <th>Rounded</th>
              <th>Part Code</th>
              <th>Price</th>
              <th>Domed Grate?</th>
            </tr>
          </thead>
          <tbody>
            {basins.map((b, i) => (
              <tr key={i}>
                <td>{b.id}</td>
                <td>{b.diameter}</td>
                <td>{b.height}</td>
                <td>{b.rounded}</td>
                <td>{b.part}</td>
                <td>{b.price}</td>
                <td>{b.domed ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

