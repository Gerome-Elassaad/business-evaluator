import { NextResponse } from "next/server"

export async function GET() {
  try {
    // In a real application, you would retrieve the extracted text from a database or session
    // For this demo, we'll return a simulated extracted text

    const extractedText = `
Product Name: AI-Powered Smart Assistant
Price: $299.99
Rating: 4.5/5 (256 reviews)

Product Description:
The AI-Powered Smart Assistant is a cutting-edge device designed to streamline your daily tasks and enhance productivity. Featuring advanced natural language processing capabilities, this assistant can understand complex commands, learn from your preferences, and adapt to your unique needs over time.

Key Features:
- Voice recognition with 99.7% accuracy
- Multi-language support (15 languages)
- Integration with smart home devices
- Personalized recommendations based on usage patterns
- Privacy-focused design with local processing options
- 8-hour battery life with fast charging

Technical Specifications:
- Processor: Quad-core 2.5GHz
- Memory: 4GB RAM
- Storage: 64GB
- Connectivity: Wi-Fi 6, Bluetooth 5.2
- Dimensions: 120mm x 80mm x 40mm
- Weight: 250g

Customer Reviews:
"This smart assistant has completely transformed how I manage my schedule. The voice recognition is impressively accurate, even in noisy environments." - John D.

"The integration with my smart home devices was seamless. I can control everything with simple voice commands." - Sarah M.

"While the features are impressive, I found the learning curve steeper than expected. Took me about a week to get comfortable with all the capabilities." - Michael T.

"The price is on the higher side, but the quality and functionality justify the investment." - Lisa R.
    `

    return NextResponse.json({ text: extractedText })
  } catch (error) {
    console.error("Error in extracted-text API:", error)
    return NextResponse.json({ error: "Failed to retrieve extracted text" }, { status: 500 })
  }
}
