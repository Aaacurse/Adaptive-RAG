from typing import TypedDict,Literal,Optional

class RAGState(TypedDict):
    query:str
    documents:Optional[list[dict]]
    avg_relevance:Optional[float]
    web_results:Optional[list[dict]]
    final_context:Optional[list[str]]
    answer:Optional[str]
    route_taken:Optional[Literal["direct","vector","web"]]
    iterations:int