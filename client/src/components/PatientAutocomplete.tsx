import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Patient {
  id: number;
  name: string;
  age: number;
  phone: string;
}

interface PatientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (patient: Patient) => void;
}

function PatientAutocomplete({ value, onChange, onSelect }: PatientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Search patients when query changes
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients/search", { q: searchQuery }],
    queryFn: () => 
      searchQuery.length > 2 
        ? fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`, { credentials: "include" })
            .then(res => res.json())
        : Promise.resolve([]),
    enabled: searchQuery.length > 2,
  });

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery(newValue);
    if (newValue.length > 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    onSelect(patient);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Digite o nome do paciente"
            className="pr-8"
          />
          {searchQuery.length > 2 && (
            <ChevronsUpDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandList>
            {patients.length === 0 && searchQuery.length > 2 && (
              <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            )}
            {patients.length > 0 && (
              <CommandGroup>
                {patients.map((patient: Patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.name}
                    onSelect={() => handleSelectPatient(patient)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === patient.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-gray-500">
                          {patient.age} anos • {patient.phone}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { PatientAutocomplete };
export default PatientAutocomplete;
