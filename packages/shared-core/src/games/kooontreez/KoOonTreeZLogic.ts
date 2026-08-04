// packages/shared-core/src/games/kooontreez/KoOonTreeZLogic.ts
import { FullCountryData, KoOonTreezLevel, KoOonTreezMode, QuizQuestion, CurrentFlag } from "./KoOonTreeZTypes";

export class KoOonTreezLogic {
    private static fullCountriesCache: FullCountryData[] = [];
    private static globalUsedCountryIds: Set<string> = new Set();
    private static readonly REST_COUNTRIES_API = "https://restcountries.com/v3.1/all?lang=fr&fields=name,capital,flags,alt,region,population,currencies,continents,cca2";

    public static async fetchCountries(): Promise<void> {
        if (KoOonTreezLogic.fullCountriesCache.length > 0) return;
        try {
            const response = await fetch(KoOonTreezLogic.REST_COUNTRIES_API);
            if (!response.ok) throw new Error(`Erreur HTTP: statut ${response.status}`);
            const data: FullCountryData[] = await response.json();
            KoOonTreezLogic.fullCountriesCache = data.filter(country =>
                country.name?.common && (country.flags?.png || country.flags?.svg) && country.cca2
            );
        } catch (error) {
            console.error("[KoOonTreeZLogic] fetchCountries: Erreur:", error);
            KoOonTreezLogic.fullCountriesCache = []; 
        }
    }

    public static resetUsedCountries(): void {
        KoOonTreezLogic.globalUsedCountryIds.clear(); 
    }

    public static getQuizQuestion(level: KoOonTreezLevel, mode: KoOonTreezMode, allCountries: FullCountryData[], roomUsedCountryIds: Set<string>): QuizQuestion | null {
        if (KoOonTreezLogic.fullCountriesCache.length === 0) return null;

        let rawCorrectCountry: FullCountryData | undefined;
        const availableCountriesForRoom = allCountries.filter(country => !roomUsedCountryIds.has(country.cca2));

        if (availableCountriesForRoom.length === 0) {
            rawCorrectCountry = KoOonTreezLogic.fullCountriesCache[Math.floor(Math.random() * KoOonTreezLogic.fullCountriesCache.length)];
        } else {
            rawCorrectCountry = availableCountriesForRoom[Math.floor(Math.random() * availableCountriesForRoom.length)];
        }

        if (!rawCorrectCountry) return null;

        const correctFlag: CurrentFlag = {
            id: rawCorrectCountry.cca2,
            countryName: rawCorrectCountry.name.common,
            imageUrl: rawCorrectCountry.flags.png || rawCorrectCountry.flags.svg || '',
            alt: rawCorrectCountry.flags.alt || '', 
            countryCapital: rawCorrectCountry.capital && rawCorrectCountry.capital.length > 0 ? rawCorrectCountry.capital[0] : 'N/A',
        };

        let question: string;
        let correctAnswer: string;
        let options: string[] = [];

        let numFakeOptionsToGenerate: number;
        switch (level) {
            case 'easy': numFakeOptionsToGenerate = 1; break;
            case 'average': numFakeOptionsToGenerate = 3; break;
            case 'normal': numFakeOptionsToGenerate = 5; break;
            case 'hard': numFakeOptionsToGenerate = 7; break;
            case 'impossible': numFakeOptionsToGenerate = KoOonTreezLogic.fullCountriesCache.length - 1; break;
            default: numFakeOptionsToGenerate = 3; 
        }

        const generateFakes = (excludeId: string, count: number, returnType: 'name' | 'imageUrl' | 'capital'): string[] => {
            const generated: string[] = [];
            const potentialFakes: FullCountryData[] = KoOonTreezLogic.fullCountriesCache.filter(c => c.cca2 !== excludeId);

            while (generated.length < count && potentialFakes.length > 0) {
                const idx = Math.floor(Math.random() * potentialFakes.length);
                const fakeCountry = potentialFakes.splice(idx, 1)[0];
                let valueToAdd: string = '';

                switch (returnType) {
                    case 'name': valueToAdd = fakeCountry.name.common; break;
                    case 'imageUrl': valueToAdd = fakeCountry.flags.png || fakeCountry.flags.svg || ''; break;
                    case 'capital': valueToAdd = fakeCountry.capital && fakeCountry.capital.length > 0 ? fakeCountry.capital[0] : 'N/A'; break;
                }

                if (valueToAdd && !generated.includes(valueToAdd)) { 
                    generated.push(valueToAdd);
                }
            }
            return generated;
        };

        switch (mode) {
            case 'DvsP': 
                question = correctFlag.imageUrl;
                correctAnswer = correctFlag.countryName;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'name')];
                break;
            case 'PvsD': 
                question = correctFlag.countryName;
                correctAnswer = correctFlag.imageUrl;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'imageUrl')];
                break;
            case 'DvsC': 
                question = correctFlag.imageUrl;
                correctAnswer = correctFlag.countryCapital;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'capital')];
                break;
            case 'CvsD': 
                question = correctFlag.countryCapital;
                correctAnswer = correctFlag.imageUrl;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'imageUrl')];
                break;
            case 'PvsC': 
                question = correctFlag.countryName;
                correctAnswer = correctFlag.countryCapital;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'capital')];
                break;
            case 'CvsP': 
                question = correctFlag.countryCapital;
                correctAnswer = correctFlag.countryName;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'name')];
                break;
            default:
                question = correctFlag.imageUrl;
                correctAnswer = correctFlag.countryName;
                options = [correctAnswer, ...generateFakes(correctFlag.id, numFakeOptionsToGenerate, 'name')];
                break;
        }

        if (!options.includes(correctAnswer)) options.push(correctAnswer);
        options = Array.from(new Set(options)); 
        options = KoOonTreezLogic.shuffleArray(options); 

        return { question, correctAnswer, options, currentFlag: correctFlag, mode: mode };
    }

    public static getHint(currentFlag: CurrentFlag, mode: KoOonTreezMode): string {
        if (!currentFlag) return "Aucun drapeau en cours pour l'indice.";

        const fullCountryData = KoOonTreezLogic.fullCountriesCache.find(c => c.cca2 === currentFlag.id);
        if (!fullCountryData) return `Indice: La capitale est ${currentFlag.countryCapital}.`;

        const hintsPool: string[] = [];

        if (fullCountryData.capital && fullCountryData.capital.length > 0 && fullCountryData.capital[0] !== 'N/A') {
            hintsPool.push(`Sa capitale est "${fullCountryData.capital[0]}".`);
        }
        if (fullCountryData.region) hintsPool.push(`Il est situé en "${fullCountryData.region}".`);
        if (fullCountryData.continents && fullCountryData.continents.length > 0) hintsPool.push(`Il se trouve sur le continent "${fullCountryData.continents[0]}".`);
        if (fullCountryData.population) hintsPool.push(`Sa population est d'environ ${fullCountryData.population.toLocaleString('fr-FR')}.`);
        if (fullCountryData.name.official) hintsPool.push(`Son nom officiel est "${fullCountryData.name.official}".`);
        if (fullCountryData.currencies) {
            const currencyCodes = Object.keys(fullCountryData.currencies);
            if (currencyCodes.length > 0) {
                const firstCurrency = fullCountryData.currencies[currencyCodes[0]];
                hintsPool.push(`Sa monnaie est le "${firstCurrency.name}" (${firstCurrency.symbol}).`);
            }
        }

        let specificHint = "";

        switch (mode) {
            case 'DvsP': 
            case 'PvsD': 
                if (hintsPool.length > 0) specificHint = hintsPool.find(h => h.includes("capitale") || h.includes("situé en") || h.includes("continent")) || hintsPool[0];
                break;
            case 'DvsC': 
            case 'CvsD': 
                if (hintsPool.length > 0) specificHint = hintsPool.find(h => h.includes("Pays") || h.includes("situé en") || h.includes("continent")) || hintsPool[0];
                break;
            case 'PvsC': 
            case 'CvsP': 
                specificHint = `Son drapeau est à l'image.`; 
                break;
            default:
                if (hintsPool.length > 0) specificHint = hintsPool[Math.floor(Math.random() * hintsPool.length)];
                else specificHint = "Aucun indice spécifique disponible.";
                break;
        }

        if (!specificHint || specificHint.trim() === "") {
            specificHint = hintsPool[Math.floor(Math.random() * hintsPool.length)] || "Essayez de deviner!";
        }

        return `Indice: ${specificHint}`;
    }

    private static shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; 
        }
        return array;
    }

    public static getAllCountries(): FullCountryData[] {
        return KoOonTreezLogic.fullCountriesCache;
    }

    public static getUsedCountryIds(): Set<string> {
        return new Set(KoOonTreezLogic.globalUsedCountryIds);
    }
}