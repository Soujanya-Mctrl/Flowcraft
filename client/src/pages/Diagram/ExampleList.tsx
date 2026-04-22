import React, { useCallback } from "react";
import MermaidImage from "./MermaidImage";
import { examples } from "./examples";
import { codeState } from "../../store/atoms";
import { useSetRecoilState } from "recoil";

const ExampleList: React.FC = () => {
  const setEditorCode = useSetRecoilState<string>(codeState);

  const handleCodeChange = useCallback(
    (value: string) => {
      setEditorCode(value);
      localStorage.setItem("mermaid_code", value);
    },
    [setEditorCode]
  );

  return (
    <div className="space-y-12">
      {examples.map((exampleCategory, categoryIndex) => (
        <div key={`${exampleCategory.category}-${categoryIndex}`}>
          <h2 className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-6 block text-text-primary">
            {exampleCategory.category}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 items-start">
            {examples[categoryIndex].diagrams.map((example) => (
              <button 
                key={example.id}
                onClick={() => handleCodeChange(example.code)}
                className="group overflow-hidden border border-border-primary bg-bg-primary transition-all duration-300 hover:border-text-primary/30 rounded-lg"
              >
                <div className="aspect-[4/3] bg-bg-primary p-4 flex items-center justify-center">
                  <div className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    <MermaidImage code={example.code} />
                  </div>
                </div>

                <div className="p-4 border-t border-border-primary bg-bg-primary">
                  <h3 className="text-[14px] font-bold text-text-primary tracking-tight">
                    {example.name}
                  </h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1 font-bold">Standard</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>

  );
};


export default ExampleList;