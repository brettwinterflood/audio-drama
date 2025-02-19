"use client";

import Avatar, { genConfig } from "react-nice-avatar";

const womanConfig = {
  sex: "woman",
  faceColor: "#F9C9B6",
  earSize: "small",
  eyeStyle: "oval",
  noseStyle: "long",
  mouthStyle: "peace",
  shirtStyle: "polo",
  glassesStyle: "none",
  hairColor: "#FC909F",
  hairStyle: "womanLong",
  hatStyle: "none",
  hatColor: "#77311D",
  eyeBrowStyle: "upWoman",
  shirtColor: "#6BD9E9",
  bgColor: "linear-gradient(45deg, #ff1717 0%, #ffd368 100%)",
};

const manConfig = {
  sex: "man",
  faceColor: "#F9C9B6",
  earSize: "small",
  eyeStyle: "circle",
  noseStyle: "long",
  mouthStyle: "laugh",
  shirtStyle: "polo",
  glassesStyle: "none",
  hairColor: "#000",
  hairStyle: "thick",
  hatStyle: "none",
  hatColor: "#506AF4",
  eyeBrowStyle: "up",
  shirtColor: "#FC909F",
  bgColor: "linear-gradient(45deg, #3e1ccd 0%, #ff6871 100%)",
};

interface Character {
  name: string;
  gender: "Male" | "Female";
  voice: {
    pitch: string;
    tempo: string;
    accent: string;
  };
  bio: string;
}

interface CharacterAvatarsProps {
  characters: { [key: string]: Character };
  currentSpeaker: string;
}

export default function CharacterAvatars({ characters, currentSpeaker }: CharacterAvatarsProps) {
  return (
    <div className="flex justify-center space-x-4 mb-4">
      {Object.entries(characters).map(([name, character]) => (
        <div
          key={name}
          className={`flex flex-col items-center text-center p-2 rounded-lg transition-colors ${
            name === currentSpeaker ? "bg-blue-100" : ""
          }`}
        >
          <Avatar
            style={{ width: "100px", height: "100px" }}
            {...genConfig(
              character.gender === "Female" ? womanConfig : manConfig
            )}
          />
          <div className={`mt-1 font-medium ${
            name === currentSpeaker ? "text-blue-600" : ""
          }`}>{name}</div>
        </div>
      ))}
    </div>
  );
}
